import * as faker from 'faker';
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import { isNumber, toNumber } from 'lodash';
import { BASIC_INSERT, BULK_INSERT } from '../sql-templates';
import { hierarchyData } from './../utils';

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
  const res = [];

  state.inserts.forEach(insertDefinition => {
    const columnNames = insertDefinition.values.map(item => `\`${item.columnName}\``);
    if (state.insertMode === 'basic') {
      res.push(...normalInsert(insertDefinition, columnNames) || []);
    } else {
      res.push(bulkInsert(insertDefinition, columnNames));
    }
  });

  if (res.length > state.maxRows) {
    processFile(res, state.maxRows);
    console.log('Files saved');
  } else {
    writeToFile(res);
    console.log('File saved');
  }
}

function normalInsert(insertDefinition, columnNames) {
  const finalInserts = [];

  for (let i = 0; i < parseInt(insertDefinition.iterations); i++) {
    const columnValues = insertDefinition.values.map(item => {
      const value = faker[item['columnType']][item['columnSubType']]();
      if (item['columnDataType'] === 'number') {
        return toNumber(value);
      }
      return `\`${value}\``;
    });

    const statement = BASIC_INSERT
      .replace('@tableName', `${insertDefinition.tableName.replace(' ', '_')}`)
      .replace('@tableColumns', columnNames.join(', '))
      .replace('@tableValues', columnValues.join(', '));

    finalInserts.push(statement);

  }
  return finalInserts;
}

function bulkInsert(insertDefinition, columnNames) {
  const columnValues = [];

  for (let i = 0; i <= toNumber(insertDefinition.iterations); i++) {
    columnValues.push(`(${insertDefinition.values.map(item => {
      const value = faker[item['columnType']][item['columnSubType']]();
      if (item['columnDataType'] === 'number') {
        return toNumber(value);
      }
      return `\`${value}\``;
    }).join(', ')})`);
  }

  return BULK_INSERT
    .replace('@tableName', `${insertDefinition.tableName.replace(' ', '_')}`)
    .replace('@tableColumns', columnNames.join(', '))
    .replace('@tableValues', columnValues.join(', '));
}

function processFile(data, maxRows) {
  let counter = 0;
  let chunkCounter = 0;

  while (counter <= maxRows) {
    const removedItems = data.splice(0, maxRows);
    writeToFile(removedItems, chunkCounter);

    counter += maxRows;
    chunkCounter++;
  }

}

function writeToFile(data, chunkNumber = undefined) {
  const fileName = chunkNumber ? `${process.cwd()}/export-${chunkNumber}.sql` : `${process.cwd()}/export.sql`;
  const stream = fs.createWriteStream(fileName);

  data.forEach(statement => {
    stream.write(`${statement}\n`, err => {
      if (err) {
        return console.log(err);
      }
    });
  });

  stream.end();
}

export async function mainPrompt() {
  let state = {
    databaseEngine: '',
    inserts: []
  };

  const { databaseEngine, wantToContinue, insertMode, maxRows } = await inquirer.prompt([
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
      type: 'list',
      name: 'insertMode',
      message: 'Choose an INSERT mode...',
      choices: [
        'bulk',
        'basic'
      ]
    },
    {
      type: 'input',
      name: 'maxRows',
      message: 'Max number of rows per file...',
      validate: value => isNumber(toNumber(value)) ? true : 'A number is required'
    },
    {
      type: 'confirm',
      name: 'wantToContinue',
      message: 'Create new Table Insert?'
    }
  ]);
  if (!wantToContinue) {
    process.exit(0);
  }

  state = {
    ...state,
    databaseEngine,
    insertMode,
    maxRows
  };

  await createInsert(state);
}
