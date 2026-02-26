async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default
  const data = await pdfParse(buffer)
  return data.text
}

async function parseDocxBuffer(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

async function parseXlsxBuffer(buffer: Buffer): Promise<string> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer)
  const parts: string[] = []
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(sheet)
    parts.push(`## Sheet: ${sheetName}\n${csv}`)
  }
  return parts.join('\n\n')
}

async function parsePptxBuffer(buffer: Buffer): Promise<string> {
  const AdmZip = (await import('adm-zip')).default
  const zip = new AdmZip(buffer)
  const slides = zip.getEntries()
    .filter(e => /ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)/)?.[1] ?? '0')
      const numB = parseInt(b.entryName.match(/slide(\d+)/)?.[1] ?? '0')
      return numA - numB
    })

  const texts: string[] = []
  for (const slide of slides) {
    const xml = slide.getData().toString('utf-8')
    const matches = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)]
    const slideText = matches.map(m => m[1]).join(' ')
    if (slideText.trim()) texts.push(slideText)
  }
  return texts.join('\n\n')
}

const MIME_TO_PARSER: Record<string, (buffer: Buffer) => Promise<string>> = {
  'application/pdf': parsePdfBuffer,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': parseDocxBuffer,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': parseXlsxBuffer,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': parsePptxBuffer,
  'text/csv': async (buffer) => buffer.toString('utf-8'),
}

export const SUPPORTED_DOCUMENT_MIMES = Object.keys(MIME_TO_PARSER)

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  const parser = MIME_TO_PARSER[mimeType]
  if (!parser) {
    throw new Error(`Unsupported document MIME type: ${mimeType}`)
  }
  return parser(buffer)
}
