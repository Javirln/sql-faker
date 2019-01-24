import program from 'commander';
import * as faker from 'faker';
import * as inquirer from 'inquirer';
import { toNumber } from 'lodash';
import { hierarchyData } from './utils';

inquirer.registerPrompt('recursive', require('inquirer-recursive'));

function getLastItemFromArray(array) {
  return array[array.length - 1];
}

function notEmptyValidator(value) {
  if ((/.+/).test(value)) { return true; }
  return 'name is required';
}

async function secondaryOption(state, selectedType) {

  const { columnSubType, columnDataType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'columnSubType',
      message: 'Which subtype?',
      choices: hierarchyData[selectedType]
    },
    {
      type: 'list',
      name: 'columnDataType',
      message: 'Data type of the column?',
      choices: ['string', 'number', 'date']
    }
  ]);

  const lastItem = getLastItemFromArray(state.inserts);

  const lastValueFromItem = getLastItemFromArray(lastItem.values);

  lastItem.values.pop();

  lastItem.values = [
    ...lastItem.values,
    {
      ...lastValueFromItem,
      columnSubType,
      columnDataType
    }
  ];

  await createInsert(state, true);
}

async function mainPrompt() {
  let state = {
    databaseEngine: '',
    inserts: []
  };

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'databaseEngine',
      message: 'Choose a database engine...',
      choices: [
        'MySQL',
        'Oracle Database',
        'SQL Server'
      ]
    },
    {
      type: 'confirm',
      name: 'wantToContinue',
      message: 'Create new Table Insert?'
    }
  ]);
  if (!answers['wantToContinue']) {
    console.log('TERMINADO EN MAIN');
    return;
  }

  state = { ...state, databaseEngine: answers['databaseEngine'] };

  await createInsert(state);
}

async function createNewTableInsert(state) {
  const { wantToContinue } = await inquirer.prompt({
    type: 'confirm',
    name: 'wantToContinue',
    message: 'Create new Table Insert?'
  });
  if (!wantToContinue) {
    processState(state);
  } else {
    await createInsert(state);
  }
}

async function createInsert(state, comingFromQuestion = false) {
  if (comingFromQuestion) {
    const { wantToContinue } = await inquirer.prompt({
      type: 'confirm',
      name: 'wantToContinue',
      message: 'Create new column?'
    });

    wantToContinue ? await createColumnOption(state) : await createNewTableInsert(state);

  } else {
    const { tableName, iterations } = await inquirer.prompt([
      {
        type: 'input',
        name: 'tableName',
        message: 'Table name...',
        validate: notEmptyValidator
      },
      {
        type: 'input',
        name: 'iterations',
        message: 'Number of rows to be generated...',
        validate: notEmptyValidator
      },

    ]);

    state.inserts = [...state.inserts, {
      tableName,
      iterations,
      values: []
    }];

    await createColumnOption(state);
  }
}

async function createColumnOption(state) {
  const { columnName, columnType } = await inquirer.prompt([
    {
      type: 'input',
      name: 'columnName',
      message: 'Column name...',
      validate: notEmptyValidator
    },
    {
      type: 'list',
      name: 'columnType',
      message: 'Type of data to be randomized',
      choices: Object.keys(hierarchyData)
    }]);

  const lastItem = getLastItemFromArray(state.inserts);

  lastItem.values = [
    ...lastItem.values, {
      columnName,
      columnType
    }
  ];

  await secondaryOption(state, columnType);

}

function processState(state) {
  const TEMPLATE = `INSERT INTO @tableName (@tableColumns) VALUES (@tableValues);`;

  state.inserts.forEach(insertDefinition => {
    insertDefinition.values.forEach(innerInsert => {
      for (let i = 0; i <= parseInt(insertDefinition.iterations); i++) {
        const columnNames = insertDefinition.values.map(item => item.columnName);
        const columnValues = insertDefinition.values.map(item => {
          const value = faker[item['columnType']][item['columnSubType']]();
          if (item['columnDataType'] === 'number') {
            return toNumber(value);
          }
          return `'${value}'`;
        });
        const statement = TEMPLATE
          .replace('@tableName', `${insertDefinition.tableName.replace(' ', '_')}`)
          .replace('@tableColumns', columnNames.join(', '))
          .replace('@tableValues', columnValues.join(', '));
        console.log(statement);
      }
    });
  });

}

program
  .version('0.0.1')
  .description('Contact management system')
  .option('-p --prompt', 'Guided creation', mainPrompt);

program.parse(process.argv);
