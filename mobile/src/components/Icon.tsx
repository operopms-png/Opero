import Svg, { Path, Rect, Circle } from 'react-native-svg'

// Line icons (1.6 stroke) — corporate, no emoji.
const P: Record<string, (c: string) => React.ReactNode> = {
  lock: c => <><Rect x={4} y={11} width={16} height={10} rx={2} stroke={c} /><Path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={c} /></>,
  key: c => <><Circle cx={8} cy={15} r={4} stroke={c} /><Path d="M11 12l9-9M17 6l3 3M15 8l2 2" stroke={c} /></>,
  home: c => <><Path d="M3 11l9-7 9 7" stroke={c} /><Path d="M5 10v10h14V10" stroke={c} /></>,
  chart: c => <Path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke={c} />,
  brief: c => <><Rect x={3} y={7} width={18} height={13} rx={2} stroke={c} /><Path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={c} /></>,
  user: c => <><Circle cx={12} cy={8} r={4} stroke={c} /><Path d="M4 21a8 8 0 0 1 16 0" stroke={c} /></>,
  msg: c => <Path d="M21 12a8 8 0 0 1-12 7l-5 1 1-4a8 8 0 1 1 16-4z" stroke={c} />,
  cal: c => <><Rect x={3} y={5} width={18} height={16} rx={2} stroke={c} /><Path d="M3 10h18M8 3v4M16 3v4" stroke={c} /></>,
  tool: c => <Path d="M14 7a4 4 0 0 0 5 5l-8 8a2 2 0 0 1-3-3l8-8a4 4 0 0 0-2-2z" stroke={c} />,
  check: c => <Path d="M5 12l5 5 9-10" stroke={c} />,
  bell: c => <><Path d="M6 9a6 6 0 0 1 12 0c0 6 2 8 2 8H4s2-2 2-8" stroke={c} /><Path d="M10 21h4" stroke={c} /></>,
  grid: c => <><Rect x={3} y={3} width={7} height={7} rx={1} stroke={c} /><Rect x={14} y={3} width={7} height={7} rx={1} stroke={c} /><Rect x={3} y={14} width={7} height={7} rx={1} stroke={c} /><Rect x={14} y={14} width={7} height={7} rx={1} stroke={c} /></>,
  doc: c => <><Path d="M6 3h8l4 4v14H6z" stroke={c} /><Path d="M14 3v4h4M9 13h6M9 17h6" stroke={c} /></>,
  mega: c => <><Path d="M3 11v3l12 5V6L3 11z" stroke={c} /><Path d="M15 9a3 3 0 0 1 0 6M6 14v4" stroke={c} /></>,
  arrow: c => <Path d="M9 6l6 6-6 6" stroke={c} />,
  back: c => <Path d="M15 6l-6 6 6 6" stroke={c} />,
  brush: c => <Path d="M4 20c4 0 6-2 6-5l9-9-3-3-9 9c-3 0-5 2-5 6" stroke={c} />,
  in: c => <Path d="M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" stroke={c} />,
  out: c => <Path d="M14 7l5 5-5 5M19 12H8M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" stroke={c} />,
  portal: c => <><Rect x={3} y={4} width={18} height={14} rx={2} stroke={c} /><Path d="M8 21h8M12 18v3" stroke={c} /></>,
  wifi: c => <><Path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0" stroke={c} /><Circle cx={12} cy={19.5} r={0.8} stroke={c} /></>,
  pin: c => <><Path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" stroke={c} /><Circle cx={12} cy={9.5} r={2.5} stroke={c} /></>,
  book: c => <><Path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" stroke={c} /><Path d="M4 21V5" stroke={c} /></>,
  card: c => <><Rect x={3} y={6} width={18} height={13} rx={2} stroke={c} /><Path d="M3 10h18" stroke={c} /></>,
  search: c => <><Circle cx={11} cy={11} r={7} stroke={c} /><Path d="M20 20l-4-4" stroke={c} /></>,
  mail: c => <><Rect x={3} y={5} width={18} height={14} rx={2} stroke={c} /><Path d="M3 7l9 6 9-6" stroke={c} /></>,
  swap: c => <Path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" stroke={c} />,
  logout: c => <Path d="M14 7l5 5-5 5M19 12H8M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" stroke={c} />,
  trash: c => <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke={c} />,
  plus: c => <Path d="M12 5v14M5 12h14" stroke={c} />,
  send: c => <Path d="M4 12l16-8-6 16-2-7-8-1z" stroke={c} />,
}

export type IconName = keyof typeof P
export default function Icon({ name, size = 20, color = '#191815' }: { name: IconName; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {P[name](color)}
    </Svg>
  )
}
