export type RitualPhase =
  | 'idle'
  | 'questionReady'
  | 'beginRitual'
  | 'splitToLeftRight'
  | 'pauseAfterSplit'
  | 'takeOneFromRight'
  | 'pauseAfterTakeOne'
  | 'countLeftByFour'
  | 'pauseAfterCountLeft'
  | 'countRightByFour'
  | 'pauseAfterCountRight'
  | 'changeComplete'
  | 'pauseBeforeNextChange'
  | 'lineComplete'
  | 'pauseBeforeNextLine'
  | 'hexagramComplete'

export const phaseLabels: Record<RitualPhase, string> = {
  idle: '静候其问',
  questionReady: '问题已置于案前',
  beginRitual: '五十蓍成，挂一以象太极',
  splitToLeftRight: '正在分草，四十九蓍分而为二',
  pauseAfterSplit: '分草已定，稍停',
  takeOneFromRight: '右取一，以象三才',
  pauseAfterTakeOne: '一策在前，稍停',
  countLeftByFour: '左堆四四数之',
  pauseAfterCountLeft: '左堆余策归前，稍停',
  countRightByFour: '右堆四四数之',
  pauseAfterCountRight: '右堆余策归前，稍停',
  changeComplete: '一变已成',
  pauseBeforeNextChange: '息一息，再起一变',
  lineComplete: '三变成一爻',
  pauseBeforeNextLine: '记爻于案，稍久停息',
  hexagramComplete: '六爻既成，卦象已定',
}

export const phaseDurations: Record<RitualPhase, number> = {
  idle: 0,
  questionReady: 0,
  beginRitual: 1200,
  splitToLeftRight: 3800,
  pauseAfterSplit: 900,
  takeOneFromRight: 1200,
  pauseAfterTakeOne: 1000,
  countLeftByFour: 240,
  pauseAfterCountLeft: 900,
  countRightByFour: 240,
  pauseAfterCountRight: 900,
  changeComplete: 1100,
  pauseBeforeNextChange: 900,
  lineComplete: 1500,
  pauseBeforeNextLine: 1900,
  hexagramComplete: 0,
}
