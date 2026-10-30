'use client'
// Staff Centre → Finance → Tax Compliance. Placeholder until the content is agreed:
// no figures or records are shown here yet.
import React from 'react'
import { CrmPage, CrmHeader, Body, Empty } from '../../../components/crm/Page'

export default function TaxCompliance() {
  return (
    <CrmPage>
      <CrmHeader title="Tax Compliance" subtitle="Tax records and filing deadlines. Nothing has been added yet." />
      <Body>
        <Empty>No tax records yet.</Empty>
      </Body>
    </CrmPage>
  )
}
