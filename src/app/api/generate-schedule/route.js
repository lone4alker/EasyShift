import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

function resolvePythonExecutable() {
  const defaultExe = process.platform === 'win32' ? 'python' : 'python3'
  const configured = process.env.PYTHON_EXECUTABLE
  if (!configured) return defaultExe
  const looksRelative = configured.startsWith('.') || configured.startsWith('..') || configured.startsWith('\\') || configured.startsWith('/')
  const abs = looksRelative ? path.resolve(process.cwd(), configured) : configured
  if (fs.existsSync(abs)) return abs
  return defaultExe
}

export async function POST(request) {
  try {
    const { businessId, daysBack = 30 } = await request.json()
    
    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
    }

    console.log(`Generating AI schedule for business: ${businessId}`)

    // Step 1: Extract data using data_extractor.py
    console.log('Step 1: Extracting data...')
    const extractorExe = resolvePythonExecutable()
    const extractorProcess = spawn(extractorExe, [
      'python/data_extractor.py', 
      '--business-id', businessId, 
      '--days-back', daysBack.toString(),
      '--json'
    ], {
      cwd: process.cwd(),
      env: { ...process.env }
    })

    let extractorStdout = ''
    let extractorStderr = ''
    extractorProcess.stdout.on('data', (d) => (extractorStdout += d.toString()))
    extractorProcess.stderr.on('data', (d) => (extractorStderr += d.toString()))

    const extractorExitCode = await new Promise((resolve) => {
      extractorProcess.on('close', resolve)
    })

    if (extractorExitCode !== 0) {
      console.error('Data extraction failed:', extractorStderr)
      return NextResponse.json({ 
        error: 'Data extraction failed', 
        details: extractorStderr 
      }, { status: 500 })
    }

    let extractedData
    try {
      extractedData = JSON.parse(extractorStdout)
    } catch (e) {
      console.error('Failed to parse extracted data:', e)
      return NextResponse.json({ 
        error: 'Invalid data format from extractor' 
      }, { status: 500 })
    }

    console.log('Data extracted successfully:', {
      staff_count: extractedData.staff?.length || 0,
      schedule_count: extractedData.schedule?.length || 0,
      feature_days: Object.keys(extractedData.feature_lookup || {}).length
    })

    // Step 2: Generate optimized schedule using index.py with business_type
    console.log('Step 2: Generating optimized schedule with business type...')
    
    // Create temporary file with extracted data including business_type
    const tempDataFile = path.join(process.cwd(), 'temp_schedule_data.json')
    fs.writeFileSync(tempDataFile, JSON.stringify(extractedData, null, 2))

    const optimizerExe = resolvePythonExecutable()
    const optimizerProcess = spawn(optimizerExe, [
      'python/index.py',
      '--input-file', tempDataFile,
      '--business-id', businessId,
      '--output-format', 'json'
    ], {
      cwd: process.cwd(),
      env: { ...process.env }
    })

    let optimizerStdout = ''
    let optimizerStderr = ''
    optimizerProcess.stdout.on('data', (d) => (optimizerStdout += d.toString()))
    optimizerProcess.stderr.on('data', (d) => (optimizerStderr += d.toString()))

    const optimizerExitCode = await new Promise((resolve) => {
      optimizerProcess.on('close', resolve)
    })

    // Clean up temporary file
    try {
      fs.unlinkSync(tempDataFile)
    } catch (e) {
      console.warn('Could not delete temp file:', e)
    }

    if (optimizerExitCode !== 0) {
      console.error('Schedule optimization failed:', optimizerStderr)
      return NextResponse.json({ 
        error: 'Schedule optimization failed', 
        details: optimizerStderr 
      }, { status: 500 })
    }

    let optimizedSchedule
    try {
      optimizedSchedule = JSON.parse(optimizerStdout)
    } catch (e) {
      console.error('Failed to parse optimized schedule:', e)
      return NextResponse.json({ 
        error: 'Invalid schedule format from optimizer' 
      }, { status: 500 })
    }

    console.log('Schedule generated successfully with business type optimization')

    // Step 3: Return the optimized schedule with business type info
    return NextResponse.json({
      success: true,
      businessId,
      businessType: extractedData.business_type || 'general',
      businessName: extractedData.business_name || 'Unknown Business',
      generatedAt: new Date().toISOString(),
      originalData: {
        staffCount: extractedData.staff?.length || 0,
        scheduleCount: extractedData.schedule?.length || 0,
        featureDays: Object.keys(extractedData.feature_lookup || {}).length
      },
      optimizedSchedule: optimizedSchedule
    })

  } catch (error) {
    console.error('Schedule generation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

