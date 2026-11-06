# GitHub avatar assets

Source: `https://avatars.githubusercontent.com/u/71755844?v=4&s=640`

The source is a 460×460 GitHub avatar. These WebP variants are generated with ffmpeg:

```bash
ffmpeg -i github-avatar.jpg -vf "scale=160:160:flags=lanczos" -c:v libwebp -quality 84 -compression_level 6 -map_metadata -1 avatar-160.webp
ffmpeg -i github-avatar.jpg -vf "scale=320:320:flags=lanczos" -c:v libwebp -quality 84 -compression_level 6 -map_metadata -1 avatar-320.webp
ffmpeg -i github-avatar.jpg -vf "scale=460:460:flags=lanczos" -c:v libwebp -quality 84 -compression_level 6 -map_metadata -1 avatar-460.webp
```

Vite fingerprints imported assets, so production filenames are content-hashed and can be cached immutably.
