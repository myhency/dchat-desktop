/**
 * read_document 도구 단위 테스트
 *
 * 각 문서 포맷(PDF, DOCX, XLSX, PPTX, CSV) 파싱, 미지원 확장자, 경로 검증.
 * 테스트 픽스쳐는 beforeAll에서 라이브러리를 이용해 직접 생성.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import type { ToolConfig } from '../adapters/outbound/builtin-tools/tool-registry'
import { readDocumentTool } from '../adapters/outbound/builtin-tools/tools/read-document'

let tmpDir: string

function makeConfig(overrides?: Partial<ToolConfig>): ToolConfig {
  return {
    allowedDirectories: [tmpDir],
    shellTimeout: 5000,
    ...overrides
  }
}

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'read-doc-test-'))

  // CSV fixture
  await fs.writeFile(path.join(tmpDir, 'test.csv'), 'name,age\nAlice,30\nBob,25')

  // DOCX fixture (minimal valid DOCX = zip with [Content_Types].xml, word/document.xml)
  const AdmZip = (await import('adm-zip')).default

  const docxZip = new AdmZip()
  docxZip.addFile('[Content_Types].xml', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>'
  ))
  docxZip.addFile('word/document.xml', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body><w:p><w:r><w:t>Hello from DOCX</w:t></w:r></w:p></w:body>' +
    '</w:document>'
  ))
  docxZip.addFile('_rels/.rels', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>'
  ))
  docxZip.writeZip(path.join(tmpDir, 'test.docx'))

  // XLSX fixture
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([['Name', 'Score'], ['Alice', 95], ['Bob', 87]])
  XLSX.utils.book_append_sheet(wb, ws, 'Results')
  XLSX.writeFile(wb, path.join(tmpDir, 'test.xlsx'))

  // PPTX fixture (minimal zip with ppt/slides/slide1.xml)
  const pptxZip = new AdmZip()
  pptxZip.addFile('ppt/slides/slide1.xml', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Slide One Title</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>' +
    '</p:sld>'
  ))
  pptxZip.addFile('ppt/slides/slide2.xml', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Slide Two Content</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>' +
    '</p:sld>'
  ))
  pptxZip.writeZip(path.join(tmpDir, 'test.pptx'))
})

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('read_document', () => {
  describe('CSV', () => {
    it('reads CSV content as plain text', async () => {
      const result = await readDocumentTool.execute(
        { path: path.join(tmpDir, 'test.csv') },
        makeConfig()
      )
      expect(result.isError).toBe(false)
      expect(result.content).toContain('name,age')
      expect(result.content).toContain('Alice,30')
    })
  })

  describe('DOCX', () => {
    it('extracts text from DOCX', async () => {
      const result = await readDocumentTool.execute(
        { path: path.join(tmpDir, 'test.docx') },
        makeConfig()
      )
      expect(result.isError).toBe(false)
      expect(result.content).toContain('Hello from DOCX')
    })
  })

  describe('XLSX', () => {
    it('extracts sheet data as CSV', async () => {
      const result = await readDocumentTool.execute(
        { path: path.join(tmpDir, 'test.xlsx') },
        makeConfig()
      )
      expect(result.isError).toBe(false)
      expect(result.content).toContain('Sheet: Results')
      expect(result.content).toContain('Alice')
      expect(result.content).toContain('95')
    })
  })

  describe('PPTX', () => {
    it('extracts slide text', async () => {
      const result = await readDocumentTool.execute(
        { path: path.join(tmpDir, 'test.pptx') },
        makeConfig()
      )
      expect(result.isError).toBe(false)
      expect(result.content).toContain('Slide One Title')
      expect(result.content).toContain('Slide Two Content')
    })

    it('preserves slide order', async () => {
      const result = await readDocumentTool.execute(
        { path: path.join(tmpDir, 'test.pptx') },
        makeConfig()
      )
      const idx1 = result.content.indexOf('Slide One Title')
      const idx2 = result.content.indexOf('Slide Two Content')
      expect(idx1).toBeLessThan(idx2)
    })
  })

  describe('unsupported extension', () => {
    it('returns error for unsupported file type', async () => {
      const filePath = path.join(tmpDir, 'test.xyz')
      await fs.writeFile(filePath, 'data')

      const result = await readDocumentTool.execute(
        { path: filePath },
        makeConfig()
      )
      expect(result.isError).toBe(true)
      expect(result.content).toContain('Unsupported document type: .xyz')
    })
  })

  describe('path validation', () => {
    it('rejects paths outside allowed directories', async () => {
      await expect(
        readDocumentTool.execute(
          { path: '/etc/passwd' },
          makeConfig()
        )
      ).rejects.toThrow('Access denied')
    })
  })
})
