import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { ChatShell } from '@/components/chat/chat-shell'

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard')
})

it('exposes the composer as a declarative WebMCP tool', () => {
  render(<ChatShell />)

  const composer = screen.getByRole('textbox', {
    name: 'Message Portfolio assistant',
  })
  const form = composer.closest('form')

  expect(form).toHaveAttribute('toolname', 'send-chat-message')
  expect(form?.getAttribute('tooldescription')).toMatch(
    /not sent to any backend/,
  )
  expect(form).not.toHaveAttribute('toolautosubmit')
  expect(composer).toHaveAttribute('toolparamdescription')
})

it('renders two profiles and defaults to the assistant thread', () => {
  render(<ChatShell />)

  const profiles = screen.getByRole('group', { name: 'Chat profiles' })
  const buttons = within(profiles).getAllByRole('button')

  expect(buttons).toHaveLength(2)
  expect(buttons[0]).toHaveAccessibleName(/Portfolio assistant/i)
  expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
  expect(buttons[1]).toHaveAccessibleName(/Gopendranath Sasmal/i)
  expect(buttons[1]).toHaveAttribute('aria-pressed', 'false')

  expect(
    screen.getByRole('log', { name: 'Portfolio assistant messages' }),
  ).toBeInTheDocument()
  expect(screen.getByText(/What is terminal-web-vm/i)).toBeInTheDocument()
})

it('switches to the owner thread', async () => {
  const user = userEvent.setup()
  render(<ChatShell />)

  await user.click(screen.getByRole('button', { name: /Gopendranath Sasmal/i }))

  expect(
    screen.getByRole('log', { name: 'Gopendranath Sasmal messages' }),
  ).toBeInTheDocument()
  expect(screen.getByText(/owner thread preview/i)).toBeInTheDocument()
  expect(screen.queryByText(/What is terminal-web-vm/i)).not.toBeInTheDocument()
})

it('sends a message locally without adding an automatic reply', async () => {
  const user = userEvent.setup()
  render(<ChatShell />)

  const log = screen.getByRole('log', {
    name: 'Portfolio assistant messages',
  })
  const before = within(log).getAllByRole('article').length
  const composer = screen.getByRole('textbox', {
    name: 'Message Portfolio assistant',
  })

  await user.type(composer, 'Can you share the stack?')
  await user.click(screen.getByRole('button', { name: 'Send message' }))

  expect(screen.getByText('Can you share the stack?')).toBeInTheDocument()
  expect(composer).toHaveValue('')
  expect(within(log).getAllByRole('article')).toHaveLength(before + 1)
})

it('keeps a separate draft for each profile', async () => {
  const user = userEvent.setup()
  render(<ChatShell />)

  await user.type(
    screen.getByRole('textbox', { name: 'Message Portfolio assistant' }),
    'draft for the assistant',
  )
  await user.click(screen.getByRole('button', { name: /Gopendranath Sasmal/i }))

  const ownerComposer = screen.getByRole('textbox', {
    name: 'Message Gopendranath Sasmal',
  })
  expect(ownerComposer).toHaveValue('')
  await user.type(ownerComposer, 'draft for the owner')

  await user.click(screen.getByRole('button', { name: /Portfolio assistant/i }))
  expect(
    screen.getByRole('textbox', { name: 'Message Portfolio assistant' }),
  ).toHaveValue('draft for the assistant')

  await user.click(screen.getByRole('button', { name: /Gopendranath Sasmal/i }))
  expect(
    screen.getByRole('textbox', { name: 'Message Gopendranath Sasmal' }),
  ).toHaveValue('draft for the owner')
})

it('keeps sent messages in their own thread', async () => {
  const user = userEvent.setup()
  render(<ChatShell />)

  await user.click(screen.getByRole('button', { name: /Gopendranath Sasmal/i }))
  await user.type(
    screen.getByRole('textbox', { name: 'Message Gopendranath Sasmal' }),
    'Owner-only message',
  )
  await user.click(screen.getByRole('button', { name: 'Send message' }))

  expect(screen.getByText('Owner-only message')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /Portfolio assistant/i }))

  expect(screen.queryByText('Owner-only message')).not.toBeInTheDocument()
})

it('blocks empty and whitespace-only messages', async () => {
  const user = userEvent.setup()
  render(<ChatShell />)

  const send = screen.getByRole('button', { name: 'Send message' })
  const composer = screen.getByRole('textbox', {
    name: 'Message Portfolio assistant',
  })

  expect(send).toBeDisabled()
  await user.type(composer, '   ')
  expect(send).toBeDisabled()
})

it('sends on Enter and keeps Shift+Enter for a new line', async () => {
  const user = userEvent.setup()
  render(<ChatShell />)

  const log = screen.getByRole('log', {
    name: 'Portfolio assistant messages',
  })
  const composer = screen.getByRole('textbox', {
    name: 'Message Portfolio assistant',
  })

  await user.type(composer, 'Enter sends this')
  await user.keyboard('{Enter}')

  expect(screen.getByText('Enter sends this')).toBeInTheDocument()
  expect(composer).toHaveValue('')

  const before = within(log).getAllByRole('article').length
  await user.type(composer, 'line one')
  await user.keyboard('{Shift>}{Enter}{/Shift}')

  expect(within(log).getAllByRole('article')).toHaveLength(before)
  expect((composer as HTMLTextAreaElement).value).toContain('line one')
})

it('caps the composer height once the message grows', async () => {
  const user = userEvent.setup()
  render(<ChatShell />)

  const composer = screen.getByRole('textbox', {
    name: 'Message Portfolio assistant',
  }) as HTMLTextAreaElement

  Object.defineProperty(composer, 'scrollHeight', {
    configurable: true,
    value: 240,
  })
  Object.defineProperty(composer, 'offsetHeight', {
    configurable: true,
    value: 46,
  })
  Object.defineProperty(composer, 'clientHeight', {
    configurable: true,
    value: 44,
  })

  await user.type(composer, 'A message that is long enough to need more room.')

  expect(composer.style.height).toBe('160px')
  expect(composer.style.overflowY).toBe('auto')
})

it('copies an incoming message from its hover actions', async () => {
  const user = userEvent.setup()
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
  render(<ChatShell />)

  const message = screen
    .getByText(/Hi — I’m the portfolio assistant/)
    .closest('article') as HTMLElement

  expect(
    within(message).queryByRole('button', { name: 'Edit message' }),
  ).not.toBeInTheDocument()

  await user.click(
    within(message).getByRole('button', { name: 'Copy message' }),
  )

  await vi.waitFor(() =>
    expect(writeText).toHaveBeenCalledWith(
      'Hi — I’m the portfolio assistant. Ask me about projects, stack choices, or availability.',
    ),
  )
})

it('edits an own message and replaces the sent time with the edit time', async () => {
  const user = userEvent.setup()
  render(<ChatShell />)

  const ownMessage = screen
    .getByText('What is terminal-web-vm?')
    .closest('article') as HTMLElement
  const sentTime = within(ownMessage).getByText(/^\d{2}:\d{2}$/).textContent

  expect(
    within(ownMessage).getByRole('button', { name: 'Copy message' }),
  ).toBeInTheDocument()
  await user.click(
    within(ownMessage).getByRole('button', { name: 'Edit message' }),
  )

  const editor = screen.getByRole('textbox', { name: 'Edit message' })
  await user.clear(editor)
  await user.type(editor, 'What is CheerpX?')
  await user.click(screen.getByRole('button', { name: 'Save edit' }))

  const editedMessage = screen
    .getByText('What is CheerpX?')
    .closest('article') as HTMLElement
  const editedMeta = within(editedMessage).getByText(/edited/i)

  expect(editedMeta).toHaveTextContent(/^edited\s+\d{2}:\d{2}$/)
  expect(
    within(editedMessage).queryByText(sentTime ?? ''),
  ).not.toBeInTheDocument()
})

it('ignores Enter while an input method is composing', () => {
  render(<ChatShell />)

  const log = screen.getByRole('log', {
    name: 'Portfolio assistant messages',
  })
  const composer = screen.getByRole('textbox', {
    name: 'Message Portfolio assistant',
  })
  const before = within(log).getAllByRole('article').length

  fireEvent.change(composer, { target: { value: 'こんにちは' } })
  fireEvent.keyDown(composer, { key: 'Enter', isComposing: true })

  expect(within(log).getAllByRole('article')).toHaveLength(before)
  expect(composer).toHaveValue('こんにちは')
})
