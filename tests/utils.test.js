const assert = require('assert')

const utils = require('../lib/utils')

const readme1 = 'README for with {{ dp.json }}'
const readme2 = 'README for with {{ datapackage }}'
const readme3 = 'README for with {{ datapackage.json }}'
const dpJson =  {
	name: "test",
	resources: []
}

describe('Utils', () => {
  it('Inserts dp.json into README', async () => {
		let res = utils.dpInReadme(readme1, dpJson)
		assert(res.indexOf(JSON.stringify(dpJson, null, 2)) > -1)

		res = utils.dpInReadme(readme2, dpJson)
		assert(res.indexOf(JSON.stringify(dpJson, null, 2)) > -1)

		res = utils.dpInReadme(readme3, dpJson)
		assert(res.indexOf(JSON.stringify(dpJson, null, 2)) > -1)
  })

	it('Sanitizes the markdown', () => {
		let res = utils.textToMarkdown('**hello world**')
		assert.equal(res, '<p><strong>hello world</strong></p>\n')
	})
	it('Does not writes not allowed tags', () => {
		let res = utils.textToMarkdown('<script> let test = test </script>**')
		assert.equal(res, '<p>**</p>\n')
	})
})