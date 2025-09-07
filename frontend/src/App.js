import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import PatientDashboard from './components/PatientDashboard';
import AdminDashboard from './components/AdminDashboard';
import UserManagement from './components/UserManagement';
import MedicineManagement from './components/MedicineManagement';
import CategoryManagement from './components/CategoryManagement';
import OrderManagement from './components/OrderManagement';
import DoctorDashboard from './components/DoctorDashboard';
import DoctorList from './components/DoctorList';
import BookAppointment from './components/BookAppointment';
import MyAppointments from './components/MyAppointments';
import Profile from './components/Profile';
import DoctorSchedule from './components/DoctorSchedule';
import ConsultationNotes from './components/ConsultationNotes';
import DoctorPatients from './components/DoctorPatients';
import MedicineCatalog from './components/MedicineCatalog';
import MedicineOrder from './components/MedicineOrder';
import OrderHistory from './components/OrderHistory';
import PrescriptionOrder from './components/PrescriptionOrder';
import StudentDashboard from './components/StudentDashboard';
import DoctorPortal from './components/DoctorPortal';
import StudentPortal from './components/StudentPortal';
import CourseManagement from './components/CourseManagement';
import ApplicationManagement from './components/ApplicationManagement';
import StudentCourseBrowse from './components/StudentCourseBrowse';
import StudentApplications from './components/StudentApplications';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<Home />} />
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/medicine-management" element={<MedicineManagement />} />
          <Route path="/category-management" element={<CategoryManagement />} />
          <Route path="/order-management" element={<OrderManagement />} />
          <Route path="/doctor-portal" element={<DoctorPortal />} />
          <Route path="/student-portal" element={<StudentPortal />} />
          <Route path="/course-management" element={<CourseManagement />} />
          <Route path="/application-management" element={<ApplicationManagement />} />
          <Route path="/student/courses" element={<StudentCourseBrowse />} />
          <Route path="/student/applications" element={<StudentApplications />} />
          <Route path="/doctors" element={<DoctorList />} />
          <Route path="/book-appointment/:doctorId" element={<BookAppointment />} />
          <Route path="/my-appointments" element={<MyAppointments />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/doctor/profile" element={<Profile />} />
          <Route path="/doctor/schedule" element={<DoctorSchedule />} />
          <Route path="/doctor/appointments/:appointmentId/notes" element={<ConsultationNotes />} />
          <Route path="/doctor/patients" element={<DoctorPatients />} />
          <Route path="/medicine-catalog" element={<MedicineCatalog />} />
          <Route path="/medicine-order" element={<MedicineOrder />} />
          <Route path="/order-history" element={<OrderHistory />} />
          <Route path="/prescription-order" element={<PrescriptionOrder />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/" element={<Register />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
