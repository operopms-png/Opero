import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { SITE_URL } from '@/lib/brand'
import { encrypt, syncMailbox } from '@/lib/mailbox'
import { exchangeCode, oauthHosts, verifyState } from '@/lib/mailbox-oauth'

// Where Google or Microsoft sends the person back after they approve. We swap the code for tokens, save the
// mailbox (refresh token encrypted) for the company that started the sign-in, load recent mail, then return
// to the Email page. The company is taken from the signed state, never from the address in the browser.
export const maxDuration = 60

const back = (q: string) => NextResponse.redirect(`${SITE_URL}/staff-centre/email?${q}`)

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const st = verifyState(sp.get('state') || '')
  if (!st) return back('oauth=error&msg=' + encodeURIComponent('That sign-in link has expired. Please try again.'))
  if (sp.get('error')) return back('oauth=error&msg=' + encodeURIComponent(sp.get('error') === 'access_denied' ? 'You cancelled the sign-in.' : 'The sign-in was not completed.'))
  const code = sp.get('code')
  if (!code) return back('oauth=error&msg=' + encodeURIComponent('The sign-in was not completed.'))

  try {
    const t = await exchangeCode(st.provider, code)
    if (!t.email) return back('oauth=error&msg=' + encodeURIComponent('Could not read the email address from the sign-in.'))
    if (!t.refresh) return back('oauth=error&msg=' + encodeURIComponent('No long-term access was granted. Please sign in again and allow access to mail.'))
    const h = oauthHosts(st.provider)
    const reset = { inbox_last_uid: 0, inbox_uidvalidity: null, sent_last_uid: 0, sent_uidvalidity: null, sent_path: null }
    const conn = { imap_host: h.imap[0], imap_port: h.imap[1], smtp_host: h.smtp[0], smtp_port: h.smtp[1], username: null, password_enc: encrypt(t.refresh), auth_type: st.provider, status: 'connected', last_error: null, ...reset }

    let mb: any
    if (st.mid) {
      const { data: cur } = await serviceClient.from('mailboxes').select('*').eq('id', st.mid).maybeSingle()
      if (!cur || cur.user_id !== st.biz) return back('oauth=error&msg=' + encodeURIComponent('Mailbox not found.'))
      if (cur.email.toLowerCase() !== t.email) return back('oauth=error&msg=' + encodeURIComponent(`You signed in as ${t.email}, but this mailbox is ${cur.email}. Sign in with the matching account.`))
      await serviceClient.from('mailbox_messages').delete().eq('mailbox_id', cur.id)
      await serviceClient.from('mailboxes').update(conn).eq('id', cur.id)
      mb = { ...cur, ...conn }
    } else {
      const { data: ex } = await serviceClient.from('mailboxes').select('*').eq('user_id', st.biz).eq('email', t.email).maybeSingle()
      if (ex) {
        await serviceClient.from('mailbox_messages').delete().eq('mailbox_id', ex.id)
        await serviceClient.from('mailboxes').update(conn).eq('id', ex.id)
        mb = { ...ex, ...conn }
      } else {
        const { data: ins, error } = await serviceClient.from('mailboxes').insert({
          user_id: st.biz, email: t.email, display_name: st.name || null, kind: st.kind,
          ...(st.kind === 'staff' ? { access: [t.email] } : {}), ...conn,
        }).select('*').single()
        if (error) return back('oauth=error&msg=' + encodeURIComponent(error.message))
        mb = ins
      }
    }
    const r = await syncMailbox(mb)
    return back(`oauth=ok&email=${encodeURIComponent(t.email)}&n=${r.added}`)
  } catch (e: any) {
    return back('oauth=error&msg=' + encodeURIComponent(String(e?.message || 'Sign-in failed').slice(0, 160)))
  }
}
