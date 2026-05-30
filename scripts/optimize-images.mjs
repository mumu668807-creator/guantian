import { stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import sharp from 'sharp'

const assetsDir = new URL('../src/assets/', import.meta.url)

const images = [
  {
    input: 'tabletop-ritual-space.png',
    outputs: [
      { name: 'tabletop-ritual-space.webp', width: 1920, quality: 95, withoutEnlargement: true },
      { name: 'tabletop-ritual-space-1280.webp', width: 1280, quality: 100, withoutEnlargement: true },
    ],
  },
  {
    input: 'entrance-ritual-space.png',
    outputs: [
      { name: 'entrance-ritual-space.webp', width: 1920, quality: 100, withoutEnlargement: true },
      { name: 'entrance-ritual-space-1280.webp', width: 1280, quality: 100, withoutEnlargement: true },
    ],
  },
]

const formatBytes = (bytes) => `${Math.round(bytes / 1024)} KB`

for (const image of images) {
  const inputPath = join(assetsDir.pathname, image.input)
  const inputStats = await stat(inputPath)
  console.log(`${image.input}: ${formatBytes(inputStats.size)}`)

  for (const output of image.outputs) {
    const outputPath = join(assetsDir.pathname, output.name)
    await sharp(inputPath)
      .resize({
        width: output.width,
        withoutEnlargement: output.withoutEnlargement,
      })
      .webp({
        quality: output.quality,
        effort: 6,
      })
      .toFile(outputPath)

    const outputStats = await stat(outputPath)
    console.log(`  -> ${basename(outputPath)}: ${formatBytes(outputStats.size)}`)
  }
}
