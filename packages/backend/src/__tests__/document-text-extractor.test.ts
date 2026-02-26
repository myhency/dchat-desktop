/**
 * extractTextFromBuffer 유틸리티 단위 테스트
 *
 * Buffer 입력으로 각 문서 포맷(CSV, DOCX, XLSX, PPTX) 텍스트 추출 검증.
 * PDF는 pdf-parse가 실제 PDF 바이너리를 요구하므로 생략 (read-document.test.ts에서 커버).
 * 테스트 픽스쳐는 beforeAll에서 라이브러리를 이용해 메모리에서 생성.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { extractTextFromBuffer, SUPPORTED_DOCUMENT_MIMES } from '../adapters/outbound/llm/document-text-extractor'

let csvBuffer: Buffer
let docxBuffer: Buffer
let xlsxBuffer: Buffer
let pptxBuffer: Buffer

beforeAll(async () => {
  // CSV fixture
  csvBuffer = Buffer.from('name,age\nAlice,30\nBob,25')

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
    '<w:body><w:p><w:r><w:t>Hello from DOCX buffer</w:t></w:r></w:p></w:body>' +
    '</w:document>'
  ))
  docxZip.addFile('_rels/.rels', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>'
  ))
  docxBuffer = docxZip.toBuffer()

  // XLSX fixture
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([['Name', 'Score'], ['Alice', 95], ['Bob', 87]])
  XLSX.utils.book_append_sheet(wb, ws, 'Results')
  xlsxBuffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))

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
  pptxBuffer = pptxZip.toBuffer()
})

describe('extractTextFromBuffer', () => {
  describe('SUPPORTED_DOCUMENT_MIMES', () => {
    it('exports supported MIME types', () => {
      expect(SUPPORTED_DOCUMENT_MIMES).toContain('application/pdf')
      expect(SUPPORTED_DOCUMENT_MIMES).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      expect(SUPPORTED_DOCUMENT_MIMES).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      expect(SUPPORTED_DOCUMENT_MIMES).toContain('application/vnd.openxmlformats-officedocument.presentationml.presentation')
      expect(SUPPORTED_DOCUMENT_MIMES).toContain('text/csv')
    })
  })

  describe('CSV', () => {
    it('extracts CSV text from buffer', async () => {
      const text = await extractTextFromBuffer(csvBuffer, 'text/csv')
      expect(text).toContain('name,age')
      expect(text).toContain('Alice,30')
    })
  })

  describe('DOCX', () => {
    it('extracts text from DOCX buffer', async () => {
      const text = await extractTextFromBuffer(
        docxBuffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
      expect(text).toContain('Hello from DOCX buffer')
    })
  })

  describe('XLSX', () => {
    it('extracts sheet data from XLSX buffer', async () => {
      const text = await extractTextFromBuffer(
        xlsxBuffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      expect(text).toContain('Sheet: Results')
      expect(text).toContain('Alice')
      expect(text).toContain('95')
    })
  })

  describe('PPTX', () => {
    it('extracts slide text from PPTX buffer', async () => {
      const text = await extractTextFromBuffer(
        pptxBuffer,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      )
      expect(text).toContain('Slide One Title')
      expect(text).toContain('Slide Two Content')
    })

    it('preserves slide order', async () => {
      const text = await extractTextFromBuffer(
        pptxBuffer,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      )
      const idx1 = text.indexOf('Slide One Title')
      const idx2 = text.indexOf('Slide Two Content')
      expect(idx1).toBeLessThan(idx2)
    })
  })

  describe('unsupported MIME type', () => {
    it('throws for unsupported MIME type', async () => {
      await expect(
        extractTextFromBuffer(Buffer.from('data'), 'application/octet-stream')
      ).rejects.toThrow('Unsupported document MIME type: application/octet-stream')
    })
  })
})
