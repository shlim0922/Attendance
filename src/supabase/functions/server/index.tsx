import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js'
import * as kv from './kv_store.tsx'

const app = new Hono()

app.use('*', cors({
  origin: '*',
  allowHeaders: ['*'],
  allowMethods: ['*'],
}))

app.use('*', logger(console.log))

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Student management routes
app.get('/make-server-9e330fc8/students', async (c) => {
  try {
    const students = await kv.getByPrefix('student:')
    // Filter out any null or invalid entries
    const validStudents = students
      .map(item => item?.value)
      .filter(student => student && student.id && student.name)
    return c.json({ students: validStudents })
  } catch (error) {
    console.error('Error fetching students:', error)
    return c.json({ error: 'Failed to fetch students' }, 500)
  }
})

app.post('/make-server-9e330fc8/students', async (c) => {
  try {
    const body = await c.req.json()
    const { name, email, studentNumber, country } = body

    if (!name || !email || !studentNumber) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const studentId = `STU${Date.now()}`
    const student = {
      id: studentId,
      name,
      email,
      studentNumber,
      country: country || '',
      qrCode: studentId,
      createdAt: new Date().toISOString(),
    }

    await kv.set(`student:${studentId}`, student)
    return c.json({ student })
  } catch (error) {
    console.error('Error creating student:', error)
    return c.json({ error: 'Failed to create student' }, 500)
  }
})

app.put('/make-server-9e330fc8/students/:id', async (c) => {
  try {
    const studentId = c.req.param('id')
    const body = await c.req.json()
    
    const existingStudent = await kv.get(`student:${studentId}`)
    if (!existingStudent) {
      return c.json({ error: 'Student not found' }, 404)
    }

    const updatedStudent = { ...existingStudent, ...body }
    await kv.set(`student:${studentId}`, updatedStudent)
    
    return c.json({ student: updatedStudent })
  } catch (error) {
    console.error('Error updating student:', error)
    return c.json({ error: 'Failed to update student' }, 500)
  }
})

app.delete('/make-server-9e330fc8/students/:id', async (c) => {
  try {
    const studentId = c.req.param('id')
    
    const existingStudent = await kv.get(`student:${studentId}`)
    if (!existingStudent) {
      return c.json({ error: 'Student not found' }, 404)
    }

    await kv.del(`student:${studentId}`)
    
    // Also delete all attendance records for this student
    const attendanceRecords = await kv.getByPrefix('attendance:')
    const studentAttendanceRecords = attendanceRecords.filter(
      record => record && record.value && record.value.studentId === studentId
    )
    
    for (const record of studentAttendanceRecords) {
      await kv.del(`attendance:${record.value.id}`)
    }
    
    return c.json({ message: 'Student deleted successfully' })
  } catch (error) {
    console.error('Error deleting student:', error)
    return c.json({ error: 'Failed to delete student' }, 500)
  }
})

// Attendance management routes
app.get('/make-server-9e330fc8/attendance', async (c) => {
  try {
    const records = await kv.getByPrefix('attendance:')
    // Filter out any null or invalid entries
    const validRecords = records
      .map(item => item?.value)
      .filter(record => record && record.id && record.studentId && record.timestamp)
    
    // Sort by timestamp descending
    validRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    return c.json({ attendanceRecords: validRecords })
  } catch (error) {
    console.error('Error fetching attendance records:', error)
    return c.json({ error: 'Failed to fetch attendance records' }, 500)
  }
})

app.post('/make-server-9e330fc8/attendance/checkin', async (c) => {
  try {
    const body = await c.req.json()
    const { qrCode } = body

    if (!qrCode) {
      return c.json({ error: 'QR code is required' }, 400)
    }

    // Find student by QR code
    const students = await kv.getByPrefix('student:')
    // Filter out any null or invalid entries before searching
    const validStudents = students
      .filter(item => item && item.value && item.value.qrCode && item.value.id && item.value.name)
    const student = validStudents.find(item => item.value.qrCode === qrCode)

    if (!student) {
      return c.json({ error: 'Student not found' }, 404)
    }

    // Check if student already checked in today
    const today = new Date().toDateString()
    const attendanceRecords = await kv.getByPrefix('attendance:')
    // Filter out any null or invalid attendance records
    const validAttendanceRecords = attendanceRecords
      .filter(record => record && record.value && record.value.studentId && record.value.timestamp)
    const todayRecord = validAttendanceRecords.find(record => 
      record.value.studentId === student.value.id && 
      new Date(record.value.timestamp).toDateString() === today
    )

    if (todayRecord) {
      return c.json({ 
        error: 'Already checked in', 
        message: `${student.value.name} has already checked in today`,
        student: student.value 
      }, 409)
    }

    // Create attendance record
    const attendanceId = `ATT${Date.now()}`
    const attendanceRecord = {
      id: attendanceId,
      studentId: student.value.id,
      timestamp: new Date().toISOString(),
      status: 'present',
    }

    await kv.set(`attendance:${attendanceId}`, attendanceRecord)

    return c.json({ 
      success: true,
      message: `${student.value.name} checked in successfully!`,
      student: student.value,
      attendanceRecord 
    })
  } catch (error) {
    console.error('Error checking in student:', error)
    return c.json({ error: 'Failed to check in student' }, 500)
  }
})

app.get('/make-server-9e330fc8/attendance/today', async (c) => {
  try {
    const today = new Date().toDateString()
    const records = await kv.getByPrefix('attendance:')
    
    // Filter for today's records and validate data
    const todayRecords = records
      .map(item => item?.value)
      .filter(record => 
        record && 
        record.id && 
        record.studentId && 
        record.timestamp &&
        new Date(record.timestamp).toDateString() === today
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    return c.json({ attendanceRecords: todayRecords })
  } catch (error) {
    console.error('Error fetching today attendance:', error)
    return c.json({ error: 'Failed to fetch today attendance' }, 500)
  }
})

// Initialize with sample data
app.post('/make-server-9e330fc8/init-sample-data', async (c) => {
  try {
    // Check if data already exists
    const existingStudents = await kv.getByPrefix('student:')
    if (existingStudents.length > 0) {
      return c.json({ message: 'Sample data already exists' })
    }

    // Create sample students
    const sampleStudents = [
      {
        id: 'STU001',
        name: 'Alice Johnson',
        email: 'alice.johnson@school.edu',
        studentNumber: '2021001',
        country: 'United States',
        qrCode: 'STU001',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'STU002',
        name: 'Bob Smith',
        email: 'bob.smith@school.edu',
        studentNumber: '2021002',
        country: 'Canada',
        qrCode: 'STU002',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'STU003',
        name: 'Carol Davis',
        email: 'carol.davis@school.edu',
        studentNumber: '2021003',
        country: 'United Kingdom',
        qrCode: 'STU003',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'STU004',
        name: 'David Wilson',
        email: 'david.wilson@school.edu',
        studentNumber: '2021004',
        country: 'Australia',
        qrCode: 'STU004',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'STU005',
        name: 'Emma Brown',
        email: 'emma.brown@school.edu',
        studentNumber: '2021005',
        country: 'Germany',
        qrCode: 'STU005',
        createdAt: new Date().toISOString(),
      },
    ]

    // Save students
    for (const student of sampleStudents) {
      await kv.set(`student:${student.id}`, student)
    }

    // Create sample attendance records
    const sampleAttendance = [
      {
        id: 'ATT001',
        studentId: 'STU001',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        status: 'present',
      },
      {
        id: 'ATT002',
        studentId: 'STU002',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        status: 'present',
      },
      {
        id: 'ATT003',
        studentId: 'STU003',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        status: 'present',
      },
    ]

    // Save attendance records
    for (const record of sampleAttendance) {
      await kv.set(`attendance:${record.id}`, record)
    }

    return c.json({ message: 'Sample data initialized successfully' })
  } catch (error) {
    console.error('Error initializing sample data:', error)
    return c.json({ error: 'Failed to initialize sample data' }, 500)
  }
})

app.get('/make-server-9e330fc8/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

Deno.serve(app.fetch)