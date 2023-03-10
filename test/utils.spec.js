import {
  extractAnnotations,
  extractYamlFromJsDoc,
  hasEmptyProperty,
  isTagPresentInTags,
  validateOptions,
} from '../src/utils.js';

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Utilities module', () => {
  describe('hasEmptyProperty', () => {
    it('identifies object with an empty object or array as property', () => {
      const invalidA = { foo: {} };
      const invalidB = { foo: [] };
      const validA = { foo: { bar: 'baz' } };
      const validB = { foo: ['¯_(ツ)_/¯'] };
      const validC = { foo: '¯_(ツ)_/¯' };

      expect(hasEmptyProperty(invalidA)).toBe(true);
      expect(hasEmptyProperty(invalidB)).toBe(true);
      expect(hasEmptyProperty(validA)).toBe(false);
      expect(hasEmptyProperty(validB)).toBe(false);
      expect(hasEmptyProperty(validC)).toBe(false);
    });
  });

  describe('extractYamlFromJsDoc', () => {
    it('should not handle false cases', () => {
      expect(
        extractYamlFromJsDoc({
          description: '',
          tags: [
            {
              title: 'coverage',
              description: 'for else path',
            },
          ],
        })
      ).toEqual([]);
    });

    it('should handle items annotated by @swagger', () => {
      const example = {
        description: '',
        tags: [
          {
            title: 'swagger',
            description:
              '/:\n  get:\n    description: Returns the homepage\n    responses:\n      200:\n        description: hello world',
          },
        ],
      };
      const result = extractYamlFromJsDoc(example);
      expect(result).toEqual([
        '/:\n' +
          '  get:\n' +
          '    description: Returns the homepage\n' +
          '    responses:\n' +
          '      200:\n' +
          '        description: hello world',
      ]);
    });

    it('should handle items annotated by @openapi', () => {
      const example = {
        description: '',
        tags: [
          {
            title: 'openapi',
            description:
              '/:\n  get:\n    description: Returns the homepage\n    responses:\n      200:\n        description: hello world',
          },
        ],
      };
      const result = extractYamlFromJsDoc(example);
      expect(result).toEqual([
        '/:\n' +
          '  get:\n' +
          '    description: Returns the homepage\n' +
          '    responses:\n' +
          '      200:\n' +
          '        description: hello world',
      ]);
    });
  });

  describe('extractAnnotations', () => {
    it('should extract jsdoc comments by default', async () => {
      expect.assertions(1);
      const result = await extractAnnotations(
        resolve(__dirname, '../../../examples/app/routes2.js')
      );
      expect(result).toEqual({
        yaml: [],
        jsdoc: [
          '/**\n   * @swagger\n   * /hello:\n   *   get:\n   *     description: Returns the homepage\n   *     responses:\n   *       200:\n   *         description: hello world\n   */',
        ],
      });
    });

    it('should extract data from YAML files', async () => {
      let result = await extractAnnotations(
        resolve(__dirname, '../../../examples/app/parameters.yaml')
      );
      expect(result).toEqual({
        yaml: [
          'parameters:\n  username:\n    name: username\n    description: Username to use for login.\n    in: formData\n    required: true\n    type: string\n',
        ],
        jsdoc: [],
      });

      result = await extractAnnotations(
        resolve(__dirname, '../../../examples/app/parameters.yml')
      );
      expect(result).toEqual({
        yaml: [
          'parameters:\n  username:\n    name: username\n    description: Username to use for login.\n    in: formData\n    required: true\n    type: string\n',
        ],
        jsdoc: [],
      });
    });

    it('should extract jsdoc comments from coffeescript files/syntax', async () => {
      const result = await extractAnnotations(
        resolve(__dirname, '../../../examples/app/route.coffee')
      );
      expect(result).toEqual({
        yaml: [],
        jsdoc: [
          '/**\n* @swagger\n* /login:\n*   post:\n*     description: Login to the application\n*     produces:\n*       - application/json\n*/',
        ],
      });
    });

    it('should return empty arrays from empty coffeescript files/syntax', async () => {
      const result = await extractAnnotations(
        resolve(__dirname, './fixtures/empty/example.coffee')
      );
      expect(result).toEqual({
        yaml: [],
        jsdoc: [],
      });
    });

    it('should return empty arrays from empty javascript files/syntax', async () => {
      const result = await extractAnnotations(
        resolve(__dirname, './fixtures/empty/example.js')
      );
      expect(result).toEqual({
        yaml: [],
        jsdoc: [],
      });
    });

    it('should respect custom encoding', async () => {
      const regular = await extractAnnotations(
        resolve(__dirname, './fixtures/non-utf-file.js')
      );
      expect(regular).toEqual({
        yaml: [],
        jsdoc: [
          '/**\n' +
            '   * @swagger\n' +
            '   * /no-utf8:\n' +
            '   *   get:\n' +
            '   *     description: 𝗵ĕŀḷ𝙤 ẘợ𝙧ḻď\n' +
            '   *     responses:\n' +
            '   *       200:\n' +
            '   *         description: ꞎǒɼ𝙚ᶆ ịⲣŝừɱ\n' +
            '   */',
        ],
      });

      const encoded = await extractAnnotations(
        resolve(__dirname, './fixtures/non-utf-file.js'),
        'ascii'
      );
      expect(encoded).toEqual({
        yaml: [],
        jsdoc: [
          '/**\n' +
            '   * @swagger\n' +
            '   * /no-utf8:\n' +
            '   *   get:\n' +
            "   *     description: p\u001d\u00175D\u0015E\u0000a87p\u001d\u0019$ a:\u0018a;#p\u001d\u0019'a8;D\u000f\n" +
            '   *     responses:\n' +
            '   *       200:\n' +
            '   *         description: j\u001e\u000eG\u0012I<p\u001d\u0019\u001aa6\u0006 a;\u000bb2#E\u001da;+I1\n' +
            '   */',
        ],
      });
    });
  });

  describe('isTagPresentInTags', () => {
    it(`should be true when it's true`, () => {
      expect(
        isTagPresentInTags(
          { name: 'Users', description: 'User management and login' },
          [
            {
              name: 'Users',
              description: 'User management and login',
            },
          ]
        )
      ).toBe(true);
    });

    it(`should be false when it's false`, () => {
      expect(
        isTagPresentInTags(
          { name: 'User', description: 'User management and login' },
          [
            {
              name: 'Users',
              description: 'User management and login',
            },
          ]
        )
      ).toBe(false);
    });
  });

  describe('validateOptions', () => {
    it('should throw on empty input', () => {
      expect(() => {
        validateOptions();
      }).toThrow("'options' parameter is required!");
    });

    it('should throw on bad input', () => {
      expect(() => {
        validateOptions({});
      }).toThrow(
        `'options.swaggerDefinition' or 'options.definition' is required!`
      );
    });

    it(`should throw on missing 'info' property`, () => {
      expect(() => {
        const options = { swaggerDefinition: {} };
        validateOptions(options);
      }).toThrow(
        `Swagger definition ('options.swaggerDefinition') should contain an info object!`
      );
    });

    it(`should throw on missing 'title' and 'version' properties in the info object`, () => {
      expect(() => {
        validateOptions({ swaggerDefinition: { info: {} } });
      }).toThrow(
        `Swagger definition info object ('options.swaggerDefinition.info') requires title and version properties!`
      );

      expect(() => {
        validateOptions({ swaggerDefinition: { info: { title: '' } } });
      }).toThrow(
        `Swagger definition info object ('options.swaggerDefinition.info') requires title and version properties!`
      );

      expect(() => {
        validateOptions({ swaggerDefinition: { info: { version: '' } } });
      }).toThrow(
        `Swagger definition info object ('options.swaggerDefinition.info') requires title and version properties!`
      );
    });

    it(`should throw on missing 'apis' property`, () => {
      expect(() => {
        validateOptions({
          swaggerDefinition: { info: { version: '', title: '' } },
        });
      }).toThrow(`'options.apis' is required and it should be an array!`);
    });

    it('should return original options on valid input', () => {
      let options = {
        swaggerDefinition: { info: { version: '', title: '' } },
        apis: [],
      };
      expect(validateOptions(options)).toEqual(options);

      options = {
        definition: { info: { version: '', title: '' } },
        apis: [],
      };
      expect(validateOptions(options)).toEqual(options);
    });
  });
});
