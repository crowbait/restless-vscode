import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import stylistic from '@stylistic/eslint-plugin-ts';

export default [{
  ignores: [
    '**/dist',
    '**/node_modules',
    '*.json',
    '*.mjs',
    '*.js',
    '*.cjs'
  ],
  files: ['**/*.ts'],
  plugins: {
    '@typescript-eslint': typescriptEslint,
    '@stylistic': stylistic
  },
  languageOptions: {
    parser: tsParser
  },
  rules: {
    /**  whether or not typescript type object members should be separated with comma */
    '@stylistic/member-delimiter-style': ['error', {
      multiline: {
        delimiter: 'none',
        requireLast: false
      },
      singleline: {
        delimiter: 'comma',
        requireLast: false
      }
    }],
    /**  whether typescript types should use Array<> or abc[], current: Array<> for all except simple (eg. string[]) */
    '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
    /**  whether functions must state their return type */
    '@typescript-eslint/explicit-function-return-type': ['error', {
      /** allows ommitting function return type in callbacks */
      allowExpressions: true
    }],
    /**  allow explicitely using 'any' type */
    '@typescript-eslint/no-explicit-any': 'off',
    /**  whether inner functions can redeclare variable names from outer score, current: no */
    '@typescript-eslint/no-shadow': 'error',
    /**  whether unused variables are permitted, current: no, allow with '_' prefix, reports ignored pattern which are NOT unused */
    '@typescript-eslint/no-unused-vars': ['error', {
      vars: 'all',
      args: 'after-used',
      reportUsedIgnorePattern: true,
      varsIgnorePattern: "^_",
      argsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_"
    }],

    /**  whether arrow functions must have a {...} body, current: must not have body if not necessary (eg. () => {return 0} -- error ; () => return 0 -- okay) */
    'arrow-body-style': ['error', 'as-needed'],
    /**  whether arrow functions must wrap their parameters in (), current: yes */
    'arrow-parens': ['error', 'always'],
    /**  whether inline blocks must have spacing, current: never (eg. () => { return 0; } -- error ; () => {return 0;} -- okay) */
    'block-spacing': ['error', 'never'],
    /**  wether last members should have a trailing / dangling comma */
    'comma-dangle': ['error', {
      arrays: 'never',
      objects: 'never',
      imports: 'never',
      exports: 'never',
      functions: 'never'
    }],
    /**  whether functions must always explicitely return a value (JS would default to undefined otherwise) */
    'consistent-return': 'off',
    /**  whether keyword (eg. if, else) must have space before and after (eg. if(true) {...}else {...}   -->   if (true) {...} else {...}) */
    'keyword-spacing': 'error',
    /**  whether empty lines between class members are prohibited, current: no (allowed) */
    'lines-between-class-members': 'off',
    /**  enforces maximum code line length, current: no */
    'max-len': 'off',
    /**  enforces new lines between chained calls (eg. in "a".replaceAll().replace().toLowerCase()), current: no */
    'newline-per-chained-call': 'off',
    /**  prohibits console calls, current: no */
    'no-console': 'off',
    /**  prohibits continue in loops, current: no */
    'no-continue': 'off',
    /**  prohibits nested ternary, eg (a ? 1 : b ? 2 : 3), current: no */
    'no-nested-ternary': 'off',
    /**  prohibits reassigning function parameter values, current: no */
    'no-param-reassign': 'off',
    /**  prohibits i++; current: no */
    'no-plusplus': 'off',
    /** see typescript  */
    'no-shadow': 'off',
    /** see typescript - handled by typescript  */
    'no-unused-vars': 'off',
    /**  whether object must have line breaks between properties, current: yes, IF object is written over more than one line */
    'object-curly-newline': ['error', { multiline: true }],
    /**  whether single line object notations must have spacing between the curlies, similar to block-spacing, current: never */
    'object-curly-spacing': ['error', 'never'],
    /** ES6 Object Shorthand - https://eslint.org/docs/latest/rules/object-shorthand, current: forbidden */
    'object-shorthand': ['error', 'never'],
    /** enforce arrow functions as callback, current: yes */
    'prefer-arrow-callback': 'error',
    /** enforces the use of const instead of let if variable isn't reassigned */
    'prefer-const': 'error',
    /** enforce using destructuring (eg. var foo = object.foo --> var {foo} = object), current: no */
    'prefer-destructuring': 'off',
    /** enforces consistent quote styles, current: single quote: ' */
    'quotes': ['error', 'single'],
    /** requires that async functions must use await, otherwise they don't need to be async; current: yes */
    'require-await': 'error',
    /** enforces line-ending semicolons, current: yes */
    'semi': ['error', 'always'],
    /** requires spaces between a comment marker and it's content, eg. //abc --> // abc */
    'spaced-comment': ['error', 'always']
  }
}];