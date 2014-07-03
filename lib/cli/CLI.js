var commander = require('commander'),
  userid = require('userid'),
  pkg = require('../../package.json'),
  path = require('path'),
  Autowire = require('wantsit').Autowire,
  suit = require('./suit')

var CLI = function() {
  this._boss = Autowire
  this._logger = Autowire
}

CLI.prototype.afterPropertiesSet = function() {

  commander
    .version(pkg.version)

  commander
    .command('list')
    .description('List all running processes')
    .option('-v, --verbose', 'Prints detailed internal logging output')
    .action(this.list.bind(this))

  commander
    .command('start <script>')
    .description('Start a process')
    .option('-u, --user <user>', 'The user to start a process as')
    .option('-g, --group <group>', 'The group to start a process as')
    .option('-i, --instances <instances>', 'How many instances of the process to start', parseInt)
    .option('-n, --name <name>', 'What name to give the process')
    .option('-v, --verbose', 'Prints detailed internal logging output')
    .action(this.start.bind(this))

  commander
    .command('cluster <pid>')
    .description('Manage clustered processes')
    .option('-w, --workers <workers>', 'Set how many workers this cluster should have', parseInt)
    .option('-v, --verbose', 'Prints detailed internal logging output')
    .action(this.cluster.bind(this))

  commander
    .command('stop <pid>')
    .description('Stop a process')
    .option('-v, --verbose', 'Prints detailed internal logging output')
    .action(this.stop.bind(this))

  commander
    .command('kill')
    .description('Stop all processes and kill the daemon')
    .option('-v, --verbose', 'Prints detailed internal logging output')
    .action(this.kill.bind(this))

  commander
    .command('key')
    .description('Manage client RSA keys')
    .action(this.key.bind(this))
    .command('add')
    .option('-n, --name', 'A key name')
    .option('-k, --key', 'The path to the key')
    .option('-v, --verbose', 'Prints detailed internal logging output')
    .description('Add a key')
    .action(this.key.bind(this))
    .command('rm')
    .option('-n, --name', 'A key name')
    .option('-v, --verbose', 'Prints detailed internal logging output')
    .description('Remove a key')
    .action(this.key.bind(this))
    .command('list')
    .description('List the keys')
    .option('-v, --verbose', 'Prints detailed internal logging output')
    .action(this.key.bind(this))

  commander.on('--help', function() {
    console.log(suit)
  })

  commander
    .command('*')
    .action(this.unknown.bind(this))

  var program = commander.parse(process.argv)

  // No command
  if(!program.args[0]) {
    this.list()
  }
}

function rpad(thing, len) {
  if (thing === undefined || thing === null) {
    thing = ''
  } else {
    thing = thing + ''
  }

  while (thing.length < len) {
    thing = thing + ' '
  }

  return thing
}

CLI.prototype.list = function(options) {
  this._setLoggingLevel(options)

  this._boss.connect().then(function() {
    this._boss.listProcesses(function(error, processes) {
      if(!processes.length) {
        console.info('\u001b[1mNo running processes\u001b[22m')
      } else {
        var lengths = {pid: 0, user: 0, group: 0, title: 0, uptime: 0, restarts: 0, cpu: 0, memory: 0}

        // Min lengths should be equal to the column title
        Object.keys(lengths).forEach(function(key) {
          lengths[key] = key.length
        })

        processes.forEach(function(proc) {
          var user = proc.uid !== undefined ? userid.username(proc.uid) : '?',
            group = proc.gid !== undefined ? userid.groupname(proc.gid) : '?',
            title = proc.title || '?',
            uptime = proc.uptime !== undefined ? proc.uptime : '?',
            restarts = proc.restarts !== undefined ? proc.restarts : '?',
            memory = proc.usage ? proc.usage.memory.rss : '?',
            cpu = proc.usage ? proc.usage.cpu : '?'

          var pidLen = (proc.pid + '').length
          lengths.pid = pidLen > lengths.pid ? pidLen : lengths.pid

          var userLen = (user + '').length
          lengths.user = userLen > lengths.user ? userLen : lengths.user

          var groupLen = (group + '').length
          lengths.group = groupLen > lengths.group ? groupLen : lengths.group

          var titleLen = (title + '').length
          lengths.title = titleLen > lengths.title ? titleLen : lengths.title

          var uptimeLen = (uptime + '').length
          lengths.uptime = uptimeLen > lengths.uptime ? uptimeLen : lengths.uptime

          var restartsLen = (restarts + '').length
          lengths.restarts = restartsLen > lengths.restarts ? restartsLen : lengths.restarts

          var memLen = (memory + '').length
          lengths.memory = memLen > lengths.memory ? memLen : lengths.memory

          var cpuLen = (cpu + '').length
          lengths.cpu = cpuLen > lengths.cpu ? cpuLen : lengths.cpu
        })

        console.log(
            '\u001b[1m' +
            rpad('pid', lengths.pid) + ' ' +
            rpad('user', lengths.user) + ' ' +
            rpad('group', lengths.group) + ' ' +
            rpad('title', lengths.title) + ' ' +
            rpad('uptime', lengths.uptime) + ' ' +
            rpad('restarts', lengths.restarts) + ' ' +
            rpad('memory', lengths.memory) + ' ' +
            rpad('cpu', lengths.cpu) +
            '\u001b[22m'
        )

        processes.forEach(function(proc) {
          var user = proc.uid !== undefined ? userid.username(proc.uid) : '?',
            group = proc.gid !== undefined ? userid.groupname(proc.gid) : '?',
            title = proc.title || '?',
            uptime = proc.uptime !== undefined ? proc.uptime : '?',
            restarts = proc.restarts !== undefined ? proc.restarts : '?',
            memory = proc.usage ? proc.usage.memory.rss : '?',
            cpu = proc.usage ? proc.usage.cpu : '?'

          console.log(
              rpad(proc.pid, lengths.pid) + ' ' +
              rpad(user, lengths.user) + ' ' +
              rpad(group, lengths.group) + ' ' +
              rpad(title, lengths.title) + ' ' +
              rpad(uptime, lengths.uptime) + ' ' +
              rpad(restarts, lengths.restarts) + ' ' +
              rpad(memory, lengths.memory) + ' ' +
              rpad(cpu, lengths.cpu)
          )
        })
      }
      process.exit(0)
    })
  }.bind(this))
}

CLI.prototype.start = function(script, options) {
  script = path.resolve(script)
  options.env = options.env || process.env

  this._setLoggingLevel(options)

  this._boss.connect().then(function() {
    this._boss.startProcess(script, options, function(error) {
      if(error) {
        console.error('\u001b[1mFailed to start ' + script + '\u001b[22m')
        console.error(error)
      }

      process.exit(0)
    })
  }.bind(this))
}

CLI.prototype.stop = function(pid, options) {
  this._setLoggingLevel(options)

  this._boss.connect().then(function() {
    this._boss.stopProcess(pid, options, function(error) {
      if(error) {
        console.error('\u001b[1mFailed to stop ' + pid + '\u001b[22m')
        console.error(error)
      }

      process.exit(0)
    })
  }.bind(this))
}

CLI.prototype.cluster = function(pid, options) {
  this._setLoggingLevel(options)

  this._boss.connect().then(function() {
    if(options.workers) {
      this._boss.setClusterWorkers(pid, options.workers, function(error) {
        if(error) {
          console.error(error.stack)
        }

        process.exit(0)
      })
    }
  }.bind(this))
}

CLI.prototype.kill = function(options) {
  this._setLoggingLevel(options)

  if(arguments.length != 1) {
    this._logger.warn('You appear to have supplied arguments to \'' + commander._name + ' kill\'.')

    if(!isNaN(parseInt(arguments[0], 10))) {
      this._logger.warn('Did you perhaps mean \'' + commander._name + ' stop ' + arguments[0] + '\' instead?')
    }

    this._logger.warn('Cowardly refusing to run.')
    process.exit(0)
  }

  this._boss.connect().then(function() {
    this._boss.kill()

    process.exit(0)
  }.bind(this))
}

CLI.prototype.key = function(options) {
  this._setLoggingLevel(options)
}

CLI.prototype.unknown = function() {
  this._logger.error('Please specify a known subcommand. See \'' + commander._name + ' --help\' for commands.')
  process.exit(0)
}

CLI.prototype._setLoggingLevel = function(options) {
  if(options.verbose) {
    this._logger.transports.console.level = 'debug'
  }
}

module.exports = CLI