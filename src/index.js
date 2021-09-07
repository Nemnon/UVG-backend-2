import '@/components/main'

process.on('unhandledRejection', (reason, promise) => {
  console.error({ reason, promise }, 'серверный процесс unhandledRejection')
})
process.on('uncaughtException', err => {
  console.error({ err }, 'серверный процесс uncaughtException')
})

