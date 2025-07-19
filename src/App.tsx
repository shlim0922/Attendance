import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Alert, AlertDescription } from './components/ui/alert';
import { toast } from 'sonner';
import { QRScanner } from './components/QRScanner';
import { StudentManagement } from './components/StudentManagement';
import { AttendanceDashboard } from './components/AttendanceDashboard';
import { Student, AttendanceRecord } from './types/student';
import { studentAPI, attendanceAPI, initializeAPI } from './utils/api';
import { QrCode, Users, BarChart3, ScanLine, RefreshCw, Database } from 'lucide-react';

export default function App() {
	const [students, setStudents] = useState<Student[]>([]);
	const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
	const [isScannerActive, setIsScannerActive] = useState(false);
	const [activeTab, setActiveTab] = useState('scanner');
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Load data from backend
	const loadData = async () => {
		try {
			setIsLoading(true);
			setError(null);

			const [studentsData, attendanceData] = await Promise.all([studentAPI.getAll(), attendanceAPI.getAll()]);

			// Filter out any null or invalid records
			const validStudents = studentsData.filter((student) => student && student.id && student.name && student.email);
			const validAttendanceRecords = attendanceData.filter((record) => record && record.id && record.studentId && record.timestamp);

			setStudents(validStudents);
			setAttendanceRecords(validAttendanceRecords);
		} catch (err) {
			console.error('Error loading data:', err);
			setError(err instanceof Error ? err.message : 'Failed to load data');
		} finally {
			setIsLoading(false);
		}
	};

	// Initialize app
	useEffect(() => {
		const initApp = async () => {
			try {
				// Check backend health
				await initializeAPI.health();

				// Load existing data
				await loadData();

				// Get the current students count after loading
				const currentStudents = await studentAPI.getAll();
				const validCurrentStudents = currentStudents.filter((student) => student && student.id && student.name && student.email);

				// If no students exist, initialize sample data
				if (validCurrentStudents.length === 0) {
					await initializeAPI.sampleData();
					await loadData();
				}
			} catch (err) {
				console.error('Error initializing app:', err);
				setError('Failed to connect to backend. Please refresh the page.');
				setIsLoading(false);
			}
		};

		initApp();
	}, []);

	const handleQRScan = async (qrCode: string) => {
		try {
			const result = await attendanceAPI.checkIn(qrCode);

			// Refresh attendance records
			const updatedRecords = await attendanceAPI.getAll();
			setAttendanceRecords(updatedRecords);

			toast.success(result.message);
		} catch (err) {
			console.error('Check-in error:', err);
			if (err instanceof Error) {
				if (err.message.includes('Already checked in')) {
					toast.error(err.message);
				} else if (err.message.includes('Student not found')) {
					toast.error(`No student found with QR code: ${qrCode}`);
				} else {
					toast.error('Failed to check in student. Please try again.');
				}
			}
		}
	};

	const handleAddStudent = async (studentData: Omit<Student, 'id' | 'qrCode' | 'createdAt'>) => {
		try {
			const newStudent = await studentAPI.create(studentData);
			setStudents((prev) => [...prev, newStudent]);
			toast.success(`Student ${studentData.name} added successfully!`);
		} catch (err) {
			console.error('Error adding student:', err);
			toast.error('Failed to add student. Please try again.');
		}
	};

	const handleUpdateStudent = async (id: string, updates: Partial<Student>) => {
		try {
			const updatedStudent = await studentAPI.update(id, updates);
			setStudents((prev) => prev.map((student) => (student.id === id ? updatedStudent : student)));
			toast.success('Student updated successfully!');
		} catch (err) {
			console.error('Error updating student:', err);
			toast.error('Failed to update student. Please try again.');
		}
	};

	const handleDeleteStudent = async (id: string) => {
		try {
			const student = students.find((s) => s.id === id);
			await studentAPI.delete(id);

			setStudents((prev) => prev.filter((s) => s.id !== id));
			setAttendanceRecords((prev) => prev.filter((record) => record.studentId !== id));

			if (student) {
				toast.success(`Student ${student.name} removed successfully!`);
			}
		} catch (err) {
			console.error('Error deleting student:', err);
			toast.error('Failed to delete student. Please try again.');
		}
	};

	const toggleScanner = () => {
		setIsScannerActive(!isScannerActive);
	};

	const handleRefresh = async () => {
		await loadData();
		toast.success('Data refreshed successfully!');
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<Card>
					<CardContent className="p-8 text-center">
						<RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
						<h3 className="mb-2">Loading Attendance System</h3>
						<p className="text-muted-foreground">Connecting to backend...</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center p-4">
				<Card className="max-w-md">
					<CardContent className="p-6 text-center">
						<Database className="mx-auto h-12 w-12 text-destructive mb-4" />
						<h3 className="mb-2">Connection Error</h3>
						<p className="text-muted-foreground mb-4">{error}</p>
						<Button onClick={() => window.location.reload()}>
							<RefreshCw className="mr-2 h-4 w-4" />
							Retry
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const todayAttendance = attendanceRecords.filter(
		(record) => record && record.timestamp && new Date(record.timestamp).toDateString() === new Date().toDateString()
	).length;

	return (
		<div className="min-h-screen bg-background p-4">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
					<div>
						<h1 className="text-3xl mb-2">Attendance System</h1>
						<p className="text-muted-foreground">Scan student QR codes to track attendance • Connected to Supabase</p>
					</div>
					<div className="flex items-center gap-4">
						<Button variant="outline" size="sm" onClick={handleRefresh}>
							<RefreshCw className="mr-2 h-4 w-4" />
							Refresh
						</Button>
						<div className="text-center">
							<p className="text-sm text-muted-foreground">Students Today</p>
							<Badge variant="secondary" className="text-lg px-3 py-1">
								{todayAttendance}/{students.length}
							</Badge>
						</div>
						<div className="text-center">
							<p className="text-sm text-muted-foreground">Scanner Status</p>
							<Badge variant={isScannerActive ? 'default' : 'secondary'}>{isScannerActive ? 'Active' : 'Inactive'}</Badge>
						</div>
					</div>
				</div>

				{/* Backend Status Alert */}
				<Alert>
					<Database className="h-4 w-4" />
					<AlertDescription>✅ Connected to Supabase backend. All data is now persisted and synced in real-time.</AlertDescription>
				</Alert>

				{/* Quick Action */}
				{!isScannerActive && activeTab === 'scanner' && (
					<Card className="border-primary">
						<CardContent className="p-6 text-center">
							<ScanLine className="mx-auto h-12 w-12 text-primary mb-4" />
							<h3 className="mb-2">Ready to Take Attendance?</h3>
							<p className="text-muted-foreground mb-4">Start the scanner to begin checking in students</p>
							<Button onClick={toggleScanner} size="lg">
								Start Taking Attendance
							</Button>
						</CardContent>
					</Card>
				)}

				{/* Main Tabs */}
				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="scanner" className="flex items-center gap-2">
							<QrCode className="h-4 w-4" />
							Scanner
						</TabsTrigger>
						<TabsTrigger value="dashboard" className="flex items-center gap-2">
							<BarChart3 className="h-4 w-4" />
							Dashboard
						</TabsTrigger>
						<TabsTrigger value="students" className="flex items-center gap-2">
							<Users className="h-4 w-4" />
							Students
						</TabsTrigger>
					</TabsList>

					<TabsContent value="scanner" className="mt-6">
						<QRScanner onScan={handleQRScan} isActive={isScannerActive} onToggle={toggleScanner} />
					</TabsContent>

					<TabsContent value="dashboard" className="mt-6">
						<AttendanceDashboard students={students} attendanceRecords={attendanceRecords} />
					</TabsContent>

					<TabsContent value="students" className="mt-6">
						<StudentManagement
							students={students}
							onAddStudent={handleAddStudent}
							onUpdateStudent={handleUpdateStudent}
							onDeleteStudent={handleDeleteStudent}
						/>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
