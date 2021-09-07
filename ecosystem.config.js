module.exports = {
  apps : [{
	cwd: '/home/uvg/',
    script: './index.js',
    watch: [
		'./index.js',
		'./config',
		'/etc/letsencrypt/live/7c3007e3a3b1.sn.mynetname.net'
	]
  }]
};
