require('@babel/register')({
  cwd: require('path').resolve(__dirname, '../../../')
});
require('./app');
