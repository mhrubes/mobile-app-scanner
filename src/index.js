const { runScan } = require('./scan')

const includeSystem = process.argv.includes('--all')

async function main() {
    const result = await runScan({ includeSystem, onProgress: (msg) => console.log(msg) })

    if (!result.success) {
        console.log('Nenalezeno zadne pripojene zarizeni.')
        console.log('Android: zapni USB debugging a potvrd RSA klic v telefonu, pripoj kabelem, over "adb devices".')
        console.log('iOS: pripoj kabelem, na telefonu potvrd "Trust This Computer", over "idevice_id -l".')
        process.exitCode = 1
        return
    }

    console.log(`  JSON: ${result.jsonPath}`)
    console.log(`  TXT:  ${result.txtPath}`)
}

main().catch((err) => {
    console.error('Chyba:', err)
    process.exitCode = 1
})
