import * as fs from 'fs/promises'
import * as path from 'path'
import type { BuiltInToolDef } from '../tool-registry'
import { validatePath } from './path-utils'

const SUPPORTED_TEXT_EXTENSIONS = [
  '.txt', '.md', '.rst', '.tex', '.html', '.htm', '.xml', '.svg',
  '.tsv', '.jsonl', '.json', '.yaml', '.yml', '.toml',
  '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.py', '.rb', '.go', '.rs',
  '.java', '.kt', '.scala', '.swift', '.c', '.cpp', '.h', '.hpp', '.cs', '.php',
  '.lua', '.r', '.pl', '.sh', '.bash', '.zsh', '.bat', '.ps1',
  '.sql', '.graphql', '.css', '.scss', '.less',
  '.ini', '.cfg', '.conf', '.env', '.properties', '.dockerfile', '.tf', '.hcl',
  '.gitignore', '.editorconfig',
  '.log', '.diff', '.patch',
]

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.pptx', '.csv', ...SUPPORTED_TEXT_EXTENSIONS]

async function parsePdf(filePath: string): Promise<{ content: string; isError: boolean }> {
  const mod = await import('pdf-parse')
  const pdfParse = (mod.default ?? mod) as unknown as (buf: Buffer) => Promise<{ text: string }>
  const buffer = await fs.readFile(filePath)
  const data = await pdfParse(buffer)
  return { content: data.text, isError: false }
}

async function parseDocx(filePath: string): Promise<{ content: string; isError: boolean }> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ path: filePath })
  return { content: result.value, isError: false }
}

async function parseXlsx(filePath: string): Promise<{ content: string; isError: boolean }> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.readFile(filePath)
  const parts: string[] = []
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(sheet)
    parts.push(`## Sheet: ${sheetName}\n${csv}`)
  }
  return { content: parts.join('\n\n'), isError: false }
}

async function parsePptx(filePath: string): Promise<{ content: string; isError: boolean }> {
  const AdmZip = (await import('adm-zip')).default
  const zip = new AdmZip(filePath)
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
  return { content: texts.join('\n\n'), isError: false }
}

async function parseCsv(filePath: string): Promise<{ content: string; isError: boolean }> {
  const content = await fs.readFile(filePath, 'utf-8')
  return { content, isError: false }
}

export const readDocumentTool: BuiltInToolDef = {
  name: 'read_document',
  description: 'Read and extract text content from document files (PDF, DOCX, XLSX, PPTX, CSV) and text-based files (code, config, markup, data). Returns the text representation of the file.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the document file' }
    },
    required: ['path']
  },
  isDangerous: false,
  async execute(args, config) {
    const filePath = args.path as string
    const validated = await validatePath(filePath, config.allowedDirectories)
    const ext = path.extname(filePath).toLowerCase()

    switch (ext) {
      case '.pdf': return parsePdf(validated)
      case '.docx': return parseDocx(validated)
      case '.xlsx': return parseXlsx(validated)
      case '.pptx': return parsePptx(validated)
      case '.csv': return parseCsv(validated)
      default: {
        if (SUPPORTED_TEXT_EXTENSIONS.includes(ext)) {
          const content = await fs.readFile(validated, 'utf-8')
          return { content, isError: false }
        }
        return {
          content: `Unsupported document type: ${ext}. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`,
          isError: true
        }
      }
    }
  }
}
