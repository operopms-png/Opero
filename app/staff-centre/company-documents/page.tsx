'use client'
// Staff Centre → Dashboard → Company Documents. The company's own file library:
// incorporation papers, ADO1 forms, certificates and insurance. Staff and the AI
// assistants read the same records through /api/documents?files=1.
import FileLibrary from '@/components/company-docs/FileLibrary'

export default function CompanyDocuments() { return <FileLibrary /> }
