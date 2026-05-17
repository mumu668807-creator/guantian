import { selectInterpretation } from '../src/domain/interpretation.ts'
import {
  getHexagramByBinary,
  getHexagramById,
  getJudgment,
  getYaoText,
  ICHING_64,
} from '../src/domain/hexagramLookup.ts'

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const select = (movingLines) =>
  selectInterpretation({
    originalHexagramBinary: '111111',
    changedHexagramBinary: '000000',
    movingLines,
  })

assert(ICHING_64.length === 64, '六十四卦资料库数量必须为 64')
assert(new Set(ICHING_64.map((hexagram) => hexagram.binary)).size === 64, 'binary 不允许重复')
assert(ICHING_64.every((hexagram) => hexagram.judgment.trim()), '每卦 judgment 必须非空')

const qian = getHexagramByBinary('111111')
const kun = getHexagramByBinary('000000')
assert(qian?.id === 1, 'getHexagramByBinary 应按 111111 查到乾卦')
assert(kun?.id === 2, 'getHexagramByBinary 应按 000000 查到坤卦')
assert(getHexagramById(1)?.binary === '111111', 'getHexagramById 应查到乾卦 binary')
assert(getJudgment('111111') === '乾：元，亨，利，贞。', '乾卦 judgment 应来自重建后的资料库')
assert(getJudgment(getHexagramById(14)?.binary ?? '') === '大有：元亨。', 'getJudgment 应返回资料库真实卦辞')
assert(getYaoText('111111', 1)?.name === '初九', 'line 1 必须是初爻')
assert(getYaoText('111111', 6)?.name === '上九', 'line 6 必须是上爻')
assert(getYaoText('111111', 1)?.text === '潜龙勿用。', '乾卦初爻爻辞上下顺序不能反')

let result = selectInterpretation({
  originalHexagramBinary: getHexagramById(14)?.binary ?? '',
  changedHexagramBinary: '000000',
  movingLines: [],
})
assert(result.primary[0].type === 'judgment', '0 动爻应取本卦卦辞')
assert(result.primary[0].source === 'original', '0 动爻应取本卦')
assert(result.primary[0].text === '大有：元亨。', '0 动爻应显示资料库真实卦辞')

result = select([3])
assert(result.primary[0].type === 'yao', '1 动爻应取爻辞')
assert(result.primary[0].line === 3, '1 动爻应取对应爻')
assert(result.primary[0].source === 'original', '1 动爻应取本卦爻辞')
assert(result.primary[0].text === getYaoText('111111', 3)?.text, '1 动爻应取真实资料库爻辞')

result = select([2, 5])
assert(result.primary[0].line === 5, '2 动爻上动为主')
assert(result.secondary[0].line === 2, '2 动爻下动为辅')

result = select([1, 3, 5])
assert(result.primary[0].type === 'judgment', '3 动爻主取本卦辞')
assert(result.primary[0].source === 'original', '3 动爻主取本卦')
assert(result.secondary[0].source === 'changed', '3 动爻辅取变卦')

result = select([1, 3, 5, 6])
assert(result.primary[0].source === 'changed', '4 动爻取变卦')
assert(result.primary[0].line === 2, '4 动爻下未变爻为主')
assert(result.secondary[0].line === 4, '4 动爻上未变爻为辅')

result = select([1, 2, 3, 5, 6])
assert(result.primary[0].source === 'changed', '5 动爻取变卦')
assert(result.primary[0].line === 4, '5 动爻取唯一未变爻')

result = select([1, 2, 3, 4, 5, 6])
assert(result.primary[0].source === 'changed', '6 动爻取变卦')
assert(result.primary[0].type === 'judgment', '6 动爻取变卦卦辞')

console.log('interpretation assertions passed')
