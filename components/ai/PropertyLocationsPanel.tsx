'use client'
// Staff Centre → AI Command Centre → Property Locations.
// Outline maps of Jamaica, the UK and Dubai (UAE), with a pin for each place where you have properties.
// Counts come from your own records: properties, pm_properties and estate_properties. Pins use the
// saved coordinates when there are any, otherwise the town listed in TOWNS, otherwise the country centre.
import React, { useEffect, useMemo, useState } from 'react'
import { supabase, getAccountId } from '../../lib/supabase'

const LINE = '#D9E2F0', BLUE = '#2F6DB5', NAVY = '#1B2F6E', MUTED = '#667085', TXT = '#101828', LIGHT = '#89CFF0'
type Key = 'JAM' | 'GBR' | 'ARE'
const COUNTRIES: { key: Key; label: string; lat: number; lng: number }[] = [
  { key: 'JAM', label: 'Jamaica', lat: 18.2, lng: -77.3 },
  { key: 'GBR', label: 'UK', lat: 52.8, lng: -1.6 },
  { key: 'ARE', label: 'Dubai', lat: 25.2, lng: 55.3 },
]
// Outline paths (Natural Earth 1:50m, simplified) with the projection used to place pins
const OUTLINES: Record<Key, { vw: number; vh: number; minLon: number; maxLat: number; cos: number; S: number; d: string }> = {
  JAM: { vw: 1000, vh: 399, minLon: -78.3386, maxLat: 18.5220, cos: 0.950416, S: 494.529318, d: 'M506 32L563 50L623 59L648 59L672 65L726 107L770 131L934 183L990 273L1000 301L958 318L904 324L853 325L805 307L785 294L736 288L748 276L726 270L699 271L679 306L655 333L613 331L596 307L574 318L555 335L533 399L497 367L459 341L411 330L315 328L267 319L230 264L215 249L176 234L139 173L125 164L20 150L0 116L7 85L41 47L58 37L115 38L169 27L193 10L218 0L416 27L462 27L506 32Z' },
  GBR: { vw: 713, vh: 1000, minLon: -8.8000, maxLat: 58.8000, cos: 0.583541, S: 111.111111, d: 'M397 798L393 802L377 807L371 812L359 822L357 823L340 821L327 807L318 801L315 800L311 802L304 804L296 803L300 797L305 793L293 791L290 789L286 784L277 784L272 785L265 791L253 797L238 788L236 784L236 777L233 771L229 769L235 761L241 756L254 751L275 739L286 734L297 725L302 719L305 712L308 703L313 695L308 694L306 688L307 682L309 677L307 671L304 664L304 659L305 654L296 654L288 656L281 660L273 665L267 666L267 662L270 657L277 649L285 643L288 638L290 633L294 628L304 620L323 611L327 610L334 611L342 610L348 607L355 606L370 616L365 601L372 597L381 611L385 612L392 610L389 608L386 608L382 606L378 601L372 587L372 579L376 571L381 563L377 561L374 559L373 551L374 544L383 538L385 528L386 518L385 514L376 514L373 516L369 519L365 519L355 508L349 499L339 481L338 471L346 447L359 433L374 427L371 426L348 426L340 428L333 434L329 436L325 437L321 440L318 444L314 447L306 446L302 447L300 444L298 440L295 439L292 440L285 446L278 449L269 446L258 439L256 442L253 448L252 457L244 449L238 438L235 431L235 424L239 421L243 423L249 406L260 382L264 375L267 367L267 361L264 356L253 345L253 335L255 325L258 319L259 318L273 318L268 315L257 305L257 302L259 293L258 294L256 298L251 308L248 310L240 313L239 317L238 319L234 319L232 323L232 324L230 319L230 311L232 304L235 298L246 285L241 289L228 301L221 309L220 312L219 314L219 316L222 330L221 337L210 379L208 383L206 385L204 386L199 385L197 382L197 378L198 373L202 353L204 347L207 342L214 333L214 332L209 334L207 334L206 332L207 305L210 296L212 283L215 272L218 264L221 254L225 249L226 242L231 235L234 227L232 228L210 248L204 252L196 251L190 249L186 244L183 234L178 234L173 233L173 231L179 226L190 224L199 216L190 211L191 209L199 204L208 189L210 174L205 167L204 163L195 158L193 152L194 148L197 145L202 142L209 139L202 136L200 133L198 129L198 126L201 114L203 109L207 102L224 103L226 100L228 99L236 102L235 99L221 84L220 81L224 73L224 69L223 65L225 62L229 61L243 61L246 60L244 56L241 50L241 46L241 42L242 34L242 31L245 26L248 24L251 23L259 25L262 27L265 32L267 32L277 27L279 26L283 32L299 27L320 25L333 22L347 20L359 17L373 18L373 21L372 23L369 32L369 41L369 44L367 47L362 53L349 62L326 83L312 93L310 98L309 105L317 107L320 109L319 113L306 125L302 136L312 136L320 133L335 126L350 121L357 121L371 125L374 125L380 123L385 123L425 124L436 122L443 125L450 132L455 145L455 147L452 153L445 161L440 171L438 177L437 183L435 189L424 215L413 230L408 240L402 249L397 254L391 257L373 261L368 264L362 268L356 271L363 270L370 268L383 267L399 276L397 283L391 289L377 290L365 302L359 306L353 308L345 307L331 304L325 301L331 306L337 309L373 316L375 316L387 308L402 308L431 322L440 332L452 347L458 353L463 359L466 367L472 393L478 419L487 447L491 455L496 461L521 473L527 477L537 489L547 502L556 512L565 520L560 524L557 531L560 540L563 548L571 562L578 577L576 575L573 573L569 574L566 573L559 568L553 563L541 565L534 564L528 564L539 567L552 568L579 592L588 607L594 627L590 635L584 641L579 648L573 655L589 666L592 665L595 664L598 660L604 651L607 648L616 647L624 648L632 650L639 649L653 653L660 656L678 672L682 680L684 691L684 703L681 715L677 725L675 738L674 742L672 746L662 756L656 760L653 759L651 759L650 761L653 766L653 773L648 777L642 779L633 777L619 786L629 790L631 795L628 803L623 807L616 809L609 809L603 811L598 815L605 813L609 815L612 822L615 824L628 827L636 827L652 825L660 825L662 826L662 832L661 847L659 849L638 861L634 870L633 875L621 874L615 879L605 883L598 887L590 892L584 893L557 887L541 888L520 893L514 892L506 887L497 884L487 883L479 878L484 887L472 895L467 896L461 896L450 898L439 897L440 903L443 908L441 910L439 911L418 907L415 908L413 911L405 909L398 903L390 899L383 897L376 898L350 907L345 917L342 930L338 942L332 951L325 952L318 946L305 939L300 934L299 934L297 936L292 938L287 938L278 940L264 945L258 949L246 960L243 963L239 973L232 975L225 969L218 966L211 969L206 972L204 969L204 963L209 956L224 950L237 936L244 928L246 923L249 920L253 918L255 913L273 891L275 887L276 878L277 869L292 864L299 846L301 844L321 841L337 841L352 845L359 845L367 844L373 839L384 822L390 814L396 807L403 799L413 784L406 789L397 798ZM299 609L301 611L308 610L306 615L298 620L293 625L287 630L284 625L281 625L275 615L274 602L281 598L291 598L299 609ZZZZZM365 1L362 2L358 2L362 -1L366 0L365 1ZM381 6L380 7L378 5L382 0L381 6ZZZM142 246L138 247L138 245L145 238L149 236L150 237L147 241L142 246ZM239 372L231 372L228 371L225 369L221 353L222 348L224 346L226 343L230 342L234 345L236 348L239 358L240 367L239 372ZM196 273L170 279L161 278L160 275L162 273L169 271L172 257L162 250L161 248L162 244L163 243L170 240L172 239L175 239L180 243L185 252L192 253L197 257L196 273ZM173 319L176 333L178 342L178 345L176 349L165 355L162 355L162 353L164 348L162 341L163 336L162 336L160 336L152 344L150 345L149 343L151 337L151 332L153 330L155 327L157 325L159 325L161 327L168 322L173 319ZM183 332L182 333L179 333L178 331L177 328L177 323L179 319L187 314L183 312L183 311L186 306L195 299L197 298L199 298L195 310L183 332ZM169 49L160 68L157 68L154 73L146 79L153 79L155 81L155 84L154 87L144 95L137 99L130 108L126 108L123 114L119 117L118 117L116 115L111 110L119 104L120 101L126 97L126 96L116 92L113 88L113 87L118 83L116 83L114 81L112 80L111 78L111 74L111 69L114 66L115 64L116 64L120 65L124 69L129 67L134 68L135 67L130 57L131 55L133 53L146 46L162 35L166 33L167 35L169 41L169 49ZM163 204L162 205L159 205L157 203L154 198L161 194L164 196L165 199L165 202L163 204ZM172 144L172 149L171 155L172 161L173 165L176 167L177 168L189 171L201 170L203 172L203 175L201 178L195 184L187 193L185 195L182 195L181 194L179 178L171 180L164 179L161 178L158 174L153 164L138 160L133 154L132 151L133 149L136 145L140 146L142 146L144 144L144 142L142 139L142 137L157 133L158 126L162 125L165 128L171 135L172 144ZM103 124L111 130L105 141L96 141L83 133L83 132L84 129L86 127L88 127L91 128L96 126L99 127L103 124ZM101 187L98 188L94 187L92 185L90 179L89 174L90 167L90 158L98 157L99 159L101 186L101 187ZM90 204L84 205L82 205L81 203L83 199L87 198L90 200L91 202L90 204ZM167 523L162 523L158 525L155 526L153 526L146 527L139 527L138 524L140 515L138 513L132 512L130 510L126 504L125 501L125 497L121 492L116 488L113 488L108 494L104 500L105 503L107 507L104 510L97 516L96 519L94 520L90 518L81 518L77 517L73 513L61 509L59 502L57 500L44 487L42 483L44 480L49 476L65 470L68 467L68 465L63 462L59 459L58 457L58 456L60 454L65 453L69 454L72 452L77 451L81 448L84 442L88 436L88 433L91 422L92 419L102 412L105 416L110 417L115 413L120 402L124 401L128 402L136 401L151 396L157 395L166 398L173 398L179 406L183 419L190 432L200 443L200 449L197 453L189 457L190 462L194 460L198 459L209 460L212 465L214 472L216 478L215 484L212 482L210 476L207 474L203 472L204 480L204 491L205 492L210 492L207 503L200 506L193 507L191 511L190 516L186 523L180 528L174 527L167 523ZM502 901L496 905L494 909L493 911L489 912L486 912L472 903L469 904L472 900L481 896L485 892L496 896L502 901Z' },
  ARE: { vw: 1000, vh: 785, minLon: 51.5687, maxLat: 26.0685, cos: 0.911083, S: 227.695687, d: 'M981 95L995 113L996 239L1000 248L993 249L984 259L975 274L962 281L951 290L941 300L933 303L921 289L913 276L915 272L921 272L923 264L919 254L912 250L902 250L892 254L883 264L877 273L876 293L879 315L878 326L873 340L872 359L875 375L878 384L879 391L869 416L878 420L904 422L913 438L918 450L916 457L897 462L874 467L857 466L825 473L809 484L814 492L819 497L822 512L817 534L809 555L798 581L785 610L768 655L754 691L752 716L752 733L751 766L736 784L733 785L717 783L712 782L696 780L671 777L640 772L602 767L560 762L516 756L470 749L423 743L379 737L337 732L299 727L267 723L243 719L228 717L222 716L205 714L195 702L184 687L173 672L161 657L149 642L138 627L127 612L115 597L104 582L93 567L81 553L69 538L58 523L47 508L35 493L24 478L13 463L5 453L1 442L0 412L0 406L7 394L11 402L20 414L34 411L41 413L46 454L57 468L70 474L114 477L141 472L196 445L224 436L302 438L365 449L463 455L482 453L535 432L568 413L587 408L600 389L608 366L615 350L625 343L634 330L641 308L659 287L732 234L774 189L778 175L802 153L820 130L907 62L925 35L935 4L936 1L943 0L954 5L955 28L951 50L951 74L949 86L957 96L971 101L977 100L981 95ZM978 190L979 180L977 175L968 174L964 183L963 195L969 196L978 190ZM366 412L350 413L337 405L366 393L374 388L382 377L389 387L382 401L376 407L366 412ZM217 405L214 407L211 394L211 391L220 385L226 395L217 405ZM489 430L489 438L468 436L463 440L445 438L429 432L440 423L470 412L482 422L489 430ZM601 370L599 375L593 374L579 370L574 364L583 356L587 356L593 364L601 370Z' },
}
// Known towns, used when a record has no saved coordinates
const TOWNS: { match: RegExp; country: Key; name: string; lat: number; lng: number }[] = [
  { match: /montego|rose hall|seawind|appleton/i, country: 'JAM', name: 'Montego Bay', lat: 18.47, lng: -77.92 },
  { match: /ocho rios/i, country: 'JAM', name: 'Ocho Rios', lat: 18.41, lng: -77.10 },
  { match: /kingston/i, country: 'JAM', name: 'Kingston', lat: 17.97, lng: -76.79 },
  { match: /porus/i, country: 'JAM', name: 'Porus', lat: 18.03, lng: -77.41 },
  { match: /manchester/i, country: 'JAM', name: 'Manchester', lat: 18.05, lng: -77.5 },
  { match: /manchester/i, country: 'GBR', name: 'Manchester', lat: 53.48, lng: -2.24 },
  { match: /belvedere/i, country: 'GBR', name: 'Belvedere', lat: 51.49, lng: 0.15 },
  { match: /london/i, country: 'GBR', name: 'London', lat: 51.51, lng: -0.13 },
  { match: /dxb|dubai|jumeirah|jumwirah/i, country: 'ARE', name: 'Dubai', lat: 25.2, lng: 55.27 },
]
const COUNTRY_NAMES: Record<string, Key> = { jamaica: 'JAM', 'united kingdom': 'GBR', uk: 'GBR', england: 'GBR', 'united arab emirates': 'ARE', uae: 'ARE', dubai: 'ARE' }
const countryOf = (c?: string | null): Key | null => COUNTRY_NAMES[(c ?? '').trim().toLowerCase()] ?? null

type Pin = { key: string; name: string; lat: number; lng: number; count: number; placed: boolean }
type Row = { address?: string | null; city?: string | null; name?: string | null; country?: string | null; lat?: number | null; lng?: number | null }

function buildPins(rows: Row[], country: Key): Pin[] {
  const groups = new Map<string, Pin>()
  const centre = COUNTRIES.find(c => c.key === country)!
  rows.forEach(r => {
    if (countryOf(r.country) !== country) return
    const text = [r.name, r.address, r.city].filter(Boolean).join(' ')
    const town = TOWNS.find(t => t.country === country && t.match.test(text))
    const hasCoords = typeof r.lat === 'number' && typeof r.lng === 'number'
    const name = town?.name ?? ((r.address || r.city || r.name || '').trim() || 'Other locations')
    const key = name
    const g = groups.get(key)
    if (g) { g.count += 1; return }
    groups.set(key, {
      key,
      name,
      lat: hasCoords ? r.lat! : town?.lat ?? centre.lat,
      lng: hasCoords ? r.lng! : town?.lng ?? centre.lng,
      count: 1,
      placed: !!town || hasCoords,
    })
  })
  return [...groups.values()]
}

export default function PropertyLocationsPanel() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [tab, setTab] = useState<Key>('JAM')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setRows([]); return }
      const uid = await getAccountId(user)
      const [ea, pm, pr] = await Promise.all([
        supabase.from('estate_properties').select('address,country,lat,lng').eq('user_id', uid),
        supabase.from('pm_properties').select('address,city,country').eq('user_id', uid),
        supabase.from('properties').select('name,city,country').eq('user_id', uid),
      ])
      setRows([...(ea.data ?? []), ...(pm.data ?? []), ...(pr.data ?? [])] as Row[])
    })()
  }, [])

  const pins = useMemo(() => (rows ? buildPins(rows, tab) : []), [rows, tab])
  const o = OUTLINES[tab]
  const total = pins.reduce((s, p) => s + p.count, 0)
  const countryTotals = useMemo(() => {
    const t: Record<string, number> = {}
    COUNTRIES.forEach(c => { t[c.key] = rows ? buildPins(rows, c.key).reduce((s, p) => s + p.count, 0) : 0 })
    return t
  }, [rows])

  const pos = (p: Pin) => {
    const x = (p.lng - o.minLon) * o.cos * o.S
    const y = (o.maxLat - p.lat) * o.S
    return { left: `${(x / o.vw) * 100}%`, top: `${(y / o.vh) * 100}%` }
  }

  return (
    <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: 14, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: TXT }}>Property Locations</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {COUNTRIES.map(c => (
            <button key={c.key} onClick={() => setTab(c.key)} style={{
              padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
              border: `1px solid ${tab === c.key ? LIGHT : LINE}`, background: tab === c.key ? '#E3F4FC' : '#fff', color: tab === c.key ? NAVY : MUTED,
            }}>{c.label} <span style={{ opacity: .7 }}>{countryTotals[c.key] ?? 0}</span></button>
          ))}
        </div>
      </div>

      {rows === null && <div style={{ color: MUTED, fontSize: 12, padding: '26px 0', textAlign: 'center' }}>Loading locations…</div>}
      {rows !== null && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
          <div style={{ position: 'relative', width: `min(100%, ${300 * o.vw / o.vh}px)`, aspectRatio: `${o.vw} / ${o.vh}` }}>
            <svg viewBox={`0 0 ${o.vw} ${o.vh}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <path d={o.d} fill="#DCEBFA" stroke={BLUE} strokeOpacity=".6" strokeWidth={Math.max(2, o.vw / 300)} />
            </svg>
            {pins.map(p => (
              <div key={p.key} style={{ position: 'absolute', ...pos(p), transform: 'translate(-50%, -100%)', display: 'flex', alignItems: 'flex-end', gap: 6, pointerEvents: 'none' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: p.placed ? NAVY : MUTED, border: '2px solid #fff', boxShadow: '0 2px 6px rgba(27,47,110,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ transform: 'rotate(45deg)', color: '#fff', fontSize: 10, fontWeight: 700 }}>{p.count}</span>
                </div>
                <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 8, padding: '3px 8px', fontSize: 11, whiteSpace: 'nowrap', color: TXT, marginBottom: 2 }}>
                  <b>{p.name}</b><div style={{ color: MUTED }}>{p.count} {p.count === 1 ? 'property' : 'properties'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {rows !== null && total === 0 && (
        <div style={{ color: MUTED, fontSize: 12, textAlign: 'center', paddingTop: 6 }}>No properties in {COUNTRIES.find(c => c.key === tab)?.label} yet</div>
      )}
    </div>
  )
}
