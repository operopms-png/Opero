'use client'
import React from 'react'
import { CrmPage, CrmHeader, Body } from '../../../../components/crm/Page'
import PropertyManagerAgents from '../../../../components/ai/PropertyManagerAgents'

export default function AgentsPage() {
  return (
    <CrmPage>
      <CrmHeader title="Agents" subtitle="Switch agents on or off, see what each one does, and set how they write. Every draft waits for your approval." />
      <Body><PropertyManagerAgents /></Body>
    </CrmPage>
  )
}
