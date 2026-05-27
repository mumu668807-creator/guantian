import type { ManualYarrowStalk } from '../domain/manualDayan'
import { splitIndexFromStalkPositions } from '../domain/manualDayan'

type YarrowSvgProps = {
  stalks: ManualYarrowStalk[]
  canChooseSplit: boolean
  isReservingOne: boolean
  onChooseSplit: (splitIndex: number) => void
}

const groupColor: Record<ManualYarrowStalk['group'], string> = {
  available: '#c6b57a',
  unusedOne: '#d9c587',
  left: '#bdad72',
  right: '#b3a069',
  takenOne: '#dbc684',
  countedLeft: '#7c714e',
  countedRight: '#74694b',
  remainder: '#d8c381',
  spent: '#605a44',
}

function clientPointToSvgX(svg: SVGSVGElement, event: React.MouseEvent<SVGSVGElement>) {
  const point = svg.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY
  return point.matrixTransform(svg.getScreenCTM()?.inverse()).x
}

export function YarrowSvg({ stalks, canChooseSplit, isReservingOne, onChooseSplit }: YarrowSvgProps) {
  const available = stalks
    .filter((stalk) => stalk.group === 'available')

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!canChooseSplit || available.length < 2) return

    const clickX = clientPointToSvgX(event.currentTarget, event)
    const splitIndex = splitIndexFromStalkPositions(available, clickX)
    onChooseSplit(splitIndex)
  }

  return (
    <svg
      className={[
        'yarrow-svg',
        canChooseSplit ? 'can-split' : '',
        isReservingOne ? 'is-reserving-one' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      viewBox="0 0 760 430"
      role="img"
      aria-label="可交互蓍草"
      onClick={handleClick}
    >
      <g className="yarrow-zones" opacity="0.2">
        <path d="M100 156 C190 132 245 135 326 154" fill="none" stroke="#efe5c7" strokeWidth="1.5" />
        <path d="M430 154 C515 132 578 134 660 156" fill="none" stroke="#efe5c7" strokeWidth="1.5" />
        <path d="M290 348 C365 332 430 334 502 350" fill="none" stroke="#efe5c7" strokeWidth="1.2" />
      </g>

      {stalks.map((stalk) => (
        <g
          className={`yarrow-stalk yarrow-${stalk.group}`}
          key={stalk.id}
          style={{
            transformBox: 'view-box',
            transformOrigin: '0 0',
            transform: `translate(${stalk.position.x}px, ${stalk.position.y}px) rotate(${stalk.position.rotation}deg)`,
          }}
        >
          <line
            x1="0"
            y1="-34"
            x2="0"
            y2="34"
            stroke={groupColor[stalk.group]}
            strokeWidth={stalk.group === 'available' ? 5 : 4.5}
            strokeLinecap="round"
          />
        </g>
      ))}

      {canChooseSplit ? <rect className="split-surface" x="48" y="160" width="664" height="175" fill="transparent" /> : null}
    </svg>
  )
}
