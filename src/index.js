import program from 'commander';
import { mainPrompt } from './commands/sql-to-file';

program
  .version('0.0.1')
  .description('Contact management system')
  .option('-s --sql-file', 'Guided creation of SQL statements to .sql file', mainPrompt);

program.parse(process.argv);
