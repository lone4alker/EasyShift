import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

function resolvePythonExecutable() {
  // Try environment variable first
  if (process.env.PYTHON_EXECUTABLE) {
    const pythonPath = process.env.PYTHON_EXECUTABLE
    if (fs.existsSync(pythonPath)) {
      return pythonPath
    }
  }
  
  // Fallback to system python
  return 'python'
}

export async function POST(request) {
  try {
    const { businessId } = await request.json()
    
    if (!businessId) {
      return NextResponse.json({ 
        error: 'Business ID is required' 
      }, { status: 400 })
    }

    console.log('Generating AI insights for business:', businessId)

    // Call AI insights generator
    const pythonExe = resolvePythonExecutable()
    const insightsProcess = spawn(pythonExe, [
      'python/ai_insights.py',
      '--business-id', businessId,
      '--json'
    ], {
      cwd: process.cwd(),
      env: { 
        ...process.env,
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_KEY: process.env.SUPABASE_KEY,
      }
    })

    let insightsStdout = ''
    let insightsStderr = ''
    insightsProcess.stdout.on('data', (d) => (insightsStdout += d.toString()))
    insightsProcess.stderr.on('data', (d) => (insightsStderr += d.toString()))

    const insightsExitCode = await new Promise((resolve) => {
      insightsProcess.on('close', resolve)
    })

    if (insightsExitCode !== 0) {
      console.error('AI insights generation failed:', insightsStderr)
      return NextResponse.json({ 
        error: 'AI insights generation failed', 
        details: insightsStderr 
      }, { status: 500 })
    }

    let insights
    try {
      insights = JSON.parse(insightsStdout)
    } catch (e) {
      console.error('Failed to parse AI insights:', e)
      return NextResponse.json({ 
        error: 'Invalid AI insights format' 
      }, { status: 500 })
    }

    console.log('AI insights generated successfully')

    return NextResponse.json({
      success: true,
      businessId,
      generatedAt: new Date().toISOString(),
      insights: insights
    })

  } catch (error) {
    console.error('AI insights error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}
