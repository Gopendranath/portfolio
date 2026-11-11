import {
  ClampToEdgeWrapping,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  NoColorSpace,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  type Texture,
  TextureLoader,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
// Brush texture from ui-layouts (MIT): https://github.com/ui-layouts/uilayouts
import brushUrl from '@/assets/ripple/brush.png'
import { rippleFragmentShader, rippleVertexShader } from './shaders'

const MAX_WAVES = 100
const WAVE_LIFE_MS = 1400
const MAX_DPR = 2
const WAVE_SIZE_RATIO = 0.19
const WAVE_INITIAL_SCALE = 1.75
const DISPLACEMENT = 0.075
const POINTER_STEP_PX = 2

export interface PortraitRipple {
  dispose: () => void
}

interface PortraitRippleOptions {
  onReady?: () => void
  onUnavailable?: () => void
}

interface Wave {
  mesh: Mesh
  material: MeshBasicMaterial
  bornAt: number
  baseScale: number
  spin: number
}

function configureBrushTexture(texture: Texture) {
  texture.colorSpace = NoColorSpace
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.generateMipmaps = false
}

export function mountPortraitRipple(
  host: HTMLElement,
  imageUrl: string,
  { onReady, onUnavailable }: PortraitRippleOptions = {},
): PortraitRipple {
  const canvas = document.createElement('canvas')
  canvas.className =
    'pointer-events-none absolute inset-0 size-full opacity-0 transition-opacity duration-300 motion-reduce:transition-none'
  host.appendChild(canvas)

  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'low-power',
    premultipliedAlpha: false,
  })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR))

  const scene = new Scene()
  const waveScene = new Scene()
  const camera = new OrthographicCamera(0, 1, 1, 0, -10, 10)
  camera.position.z = 5

  const uniforms = {
    uTexture: { value: null as Texture | null },
    uDisplacement: { value: null as Texture | null },
    uResolution: { value: new Vector2(1, 1) },
    uIntensity: { value: DISPLACEMENT },
  }

  const imageMaterial = new ShaderMaterial({
    uniforms,
    vertexShader: rippleVertexShader,
    fragmentShader: rippleFragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const planeGeometry = new PlaneGeometry(1, 1)
  const imageMesh = new Mesh(planeGeometry, imageMaterial)
  scene.add(imageMesh)

  const displacementTarget = new WebGLRenderTarget(1, 1, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  })
  uniforms.uDisplacement.value = displacementTarget.texture

  let brushReady = false
  const brushTexture = new TextureLoader().load(
    brushUrl,
    (texture) => {
      if (disposed) {
        texture.dispose()
        return
      }

      configureBrushTexture(texture)
      brushReady = true
      renderFrame()
    },
    undefined,
    () => {
      // Without the brush texture the ripples cannot render, so fall back to
      // the static portrait instead of leaving a stuck canvas.
      brushReady = false
      onUnavailable?.()
    },
  )
  const waves: Wave[] = []

  for (let index = 0; index < MAX_WAVES; index += 1) {
    const material = new MeshBasicMaterial({
      map: brushTexture,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    })
    const mesh = new Mesh(planeGeometry, material)
    mesh.visible = false
    waveScene.add(mesh)
    waves.push({ mesh, material, bornAt: 0, baseScale: 0, spin: 0 })
  }

  let imageTexture: Texture | null = null
  let waveCursor = 0
  let baseWaveSize = 96
  let lastPointerX = 0
  let lastPointerY = 0
  let hasPointer = false
  let frameId = 0
  let running = false
  let disposed = false

  function renderFrame() {
    if (!imageTexture) {
      return
    }

    renderer.setRenderTarget(displacementTarget)
    renderer.clear()
    renderer.render(waveScene, camera)
    renderer.setRenderTarget(null)
    renderer.clear()
    renderer.render(scene, camera)
  }

  function updateWaves(now: number) {
    let alive = false

    for (const wave of waves) {
      if (!wave.mesh.visible) {
        continue
      }

      const progress = (now - wave.bornAt) / WAVE_LIFE_MS

      if (progress >= 1) {
        wave.mesh.visible = false
        wave.material.opacity = 0
        continue
      }

      alive = true
      const eased = 1 - (1 - progress) * (1 - progress)
      wave.material.opacity = (1 - progress) ** 1.35
      wave.mesh.scale.setScalar(wave.baseScale * (1 + 3.4 * eased))
      wave.mesh.rotation.z += wave.spin * 0.016
    }

    return alive
  }

  function tick(now: number) {
    const alive = updateWaves(now)
    renderFrame()

    if (alive) {
      frameId = requestAnimationFrame(tick)
      return
    }

    running = false
    frameId = 0
  }

  function startLoop() {
    if (running || disposed) {
      return
    }

    running = true
    frameId = requestAnimationFrame(tick)
  }

  function spawnWave(clientX: number, clientY: number, strength = 1) {
    if (!imageTexture || !brushReady || baseWaveSize <= 0) {
      return
    }

    const rect = canvas.getBoundingClientRect()
    const wave = waves[waveCursor]
    waveCursor = (waveCursor + 1) % MAX_WAVES

    if (!wave) {
      return
    }

    wave.bornAt = performance.now()
    wave.baseScale = baseWaveSize * WAVE_INITIAL_SCALE * strength
    wave.spin = (Math.random() - 0.5) * 1.2
    wave.mesh.visible = true
    wave.mesh.position.set(clientX - rect.left, rect.bottom - clientY, 0)
    wave.mesh.rotation.z = Math.random() * Math.PI * 2
    wave.mesh.scale.setScalar(wave.baseScale)
    wave.material.opacity = 1

    startLoop()
  }

  function handlePointerMove(event: PointerEvent) {
    if (event.pointerType === 'touch' && event.buttons === 0) {
      return
    }

    if (hasPointer) {
      const distance = Math.hypot(
        event.clientX - lastPointerX,
        event.clientY - lastPointerY,
      )

      if (distance < POINTER_STEP_PX) {
        return
      }
    }

    lastPointerX = event.clientX
    lastPointerY = event.clientY
    hasPointer = true
    spawnWave(
      event.clientX,
      event.clientY,
      event.pointerType === 'touch' ? 1.25 : 1,
    )
  }

  function handlePointerDown(event: PointerEvent) {
    lastPointerX = event.clientX
    lastPointerY = event.clientY
    hasPointer = true
    spawnWave(
      event.clientX,
      event.clientY,
      event.pointerType === 'touch' ? 1.3 : 1.1,
    )
  }

  function handlePointerLeave() {
    hasPointer = false
  }

  function resize() {
    const width = Math.max(1, host.clientWidth)
    const height = Math.max(1, host.clientHeight)
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)

    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height, false)

    camera.left = 0
    camera.right = width
    camera.bottom = 0
    camera.top = height
    camera.updateProjectionMatrix()

    imageMesh.position.set(width / 2, height / 2, 0)
    imageMesh.scale.set(width, height, 1)

    const drawingWidth = Math.max(1, Math.round(width * dpr))
    const drawingHeight = Math.max(1, Math.round(height * dpr))
    displacementTarget.setSize(drawingWidth, drawingHeight)
    uniforms.uResolution.value.set(drawingWidth, drawingHeight)

    baseWaveSize = Math.min(width, height) * WAVE_SIZE_RATIO
    renderFrame()
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(host)

  function handleContextLost(event: Event) {
    event.preventDefault()
    onUnavailable?.()
  }

  host.addEventListener('pointermove', handlePointerMove)
  host.addEventListener('pointerdown', handlePointerDown)
  host.addEventListener('pointerleave', handlePointerLeave)
  host.addEventListener('pointercancel', handlePointerLeave)
  canvas.addEventListener('webglcontextlost', handleContextLost)

  const textureLoader = new TextureLoader()
  textureLoader.load(
    imageUrl,
    (texture) => {
      if (disposed) {
        texture.dispose()
        return
      }

      texture.colorSpace = NoColorSpace
      texture.minFilter = LinearFilter
      texture.magFilter = LinearFilter
      texture.wrapS = ClampToEdgeWrapping
      texture.wrapT = ClampToEdgeWrapping
      imageTexture = texture
      uniforms.uTexture.value = texture

      resize()
      canvas.style.opacity = '1'
      onReady?.()
    },
    undefined,
    () => {
      onUnavailable?.()
    },
  )

  resize()

  return {
    dispose() {
      if (disposed) {
        return
      }

      disposed = true
      cancelAnimationFrame(frameId)
      running = false

      resizeObserver.disconnect()
      host.removeEventListener('pointermove', handlePointerMove)
      host.removeEventListener('pointerdown', handlePointerDown)
      host.removeEventListener('pointerleave', handlePointerLeave)
      host.removeEventListener('pointercancel', handlePointerLeave)
      canvas.removeEventListener('webglcontextlost', handleContextLost)

      for (const wave of waves) {
        wave.material.dispose()
      }

      brushTexture.dispose()
      imageTexture?.dispose()
      planeGeometry.dispose()
      imageMaterial.dispose()
      displacementTarget.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}
