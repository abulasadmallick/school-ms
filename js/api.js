// This file simulates a server API and database.
// All functions return a Promise to mimic a real network request.

const MOCK_DB = {
    users: [
        { Email: 'admin@example.com', Password: 'admin', Role: 'admin', Name: 'Administrator', DateFormat: 'en-IN' },
        { Email: 'teacher@example.com', Password: 'teacher', Role: 'teacher', Name: 'Alice Smith', DateFormat: 'en-IN' },
    ],
    classes: [
        { ID: 1, Class: 'Class 5', Section: '["A", "B"]', FeeStructure: '{"Monthly Fee": 1200, "Admission Fee": 5000}', Terms: '["Term 1", "Term 2"]', Subjects: '{"English":{}, "Math":{}, "Science":{}}' },
        { ID: 2, Class: 'Class 6', Section: '["A"]', FeeStructure: '{"Monthly Fee": 1500, "Admission Fee": 5000}', Terms: '["Term 1", "Term 2"]', Subjects: '{"English":{}, "Math":{}, "Social Science":{}}' },
    ],
    students: [
        { ID: 'STD0001', RollNo: 1, Name: 'Rohan Sharma', Class: 'Class 5', Section: 'A', ParentName: 'Mr. Sharma', Contact: '9876543210', Address: '123 ABC Colony', Email: 'rohan@email.com', DateOfBirth: '15.05.2014', Gender: 'Male', AdmissionDate: '01.04.2024', Status: 'Active' },
        { ID: 'STD0002', RollNo: 2, Name: 'Priya Patel', Class: 'Class 5', Section: 'A', ParentName: 'Mr. Patel', Contact: '9876543211', Address: '456 XYZ Nagar', Email: 'priya@email.com', DateOfBirth: '20.08.2014', Gender: 'Female', AdmissionDate: '01.04.2024', Status: 'Active' },
        { ID: 'STD0003', RollNo: 1, Name: 'Amit Kumar', Class: 'Class 6', Section: 'A', ParentName: 'Mr. Kumar', Contact: '9876543212', Address: '789 PQR Street', Email: 'amit@email.com', DateOfBirth: '10.01.2013', Gender: 'Male', AdmissionDate: '01.04.2024', Status: 'Inactive' },
    ],
    fees: [
        { InvoiceNo: 'INV00001', StudentID: 'STD0001', Date: new Date('2025-08-31').toISOString(), Description: 'Monthly Fee - 202508', Amount: 1200, TransactionType: 'Charge', PaymentMode: ''},
        { InvoiceNo: 'INV00002', StudentID: 'STD0001', Date: new Date('2025-09-05').toISOString(), Description: 'Payment Received (Cash)', Amount: 1200, TransactionType: 'Payment', PaymentMode: 'Cash'},
        { InvoiceNo: 'INV00003', StudentID: 'STD0002', Date: new Date('2025-08-31').toISOString(), Description: 'Monthly Fee - 202508', Amount: 1200, TransactionType: 'Charge', PaymentMode: ''},
    ],
    marks: [
      { MarkID: 'M1', StudentID: 'STD0001', Class: 'Class 5', Term: 'Term 1', Subject: 'Math', Marks: 85 },
      { MarkID: 'M2', StudentID: 'STD0001', Class: 'Class 5', Term: 'Term 1', Subject: 'Science', Marks: 92 },
    ]
};

const api = {
    // A helper to simulate network delay
    _simulateDelay: (data) => new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), 250)),

    // AUTHENTICATION
    validateLogin: function(email, password) {
        const user = MOCK_DB.users.find(u => u.Email.toLowerCase() === email.toLowerCase());
        if (!user) return this._simulateDelay({ success: false, message: 'Invalid email' });
        if (user.Password !== password) return this._simulateDelay({ success: false, message: 'Invalid password' });
        
        const userSession = { email: user.Email, role: user.Role, name: user.Name, dateformat: user.DateFormat };
        return this._simulateDelay({ success: true, user: userSession });
    },

    // STUDENTS
    getStudents: function() { return this._simulateDelay(MOCK_DB.students); },
    getStudent: function(studentID) { return this._simulateDelay(MOCK_DB.students.find(s => s.ID == studentID)); },
    getStudentsByClass: function(className) {
        return this._simulateDelay(MOCK_DB.students.filter(s => s.Class == className && s.Status == 'Active'));
    },
    
    // CLASSES
    getClasses: function() { return this._simulateDelay(MOCK_DB.classes); },
    getClass: function(classId) { return this._simulateDelay(MOCK_DB.classes.find(c => c.ID == classId)); },

    // FEES
    getFeeSummariesAndChargeStudents: function() {
        const summaries = MOCK_DB.students
            .filter(s => s.Status === 'Active')
            .map(student => {
                const studentTransactions = MOCK_DB.fees.filter(f => f.StudentID == student.ID);
                const totalCharges = studentTransactions.filter(t => t.TransactionType === 'Charge').reduce((sum, t) => sum + Number(t.Amount), 0);
                const totalPayments = studentTransactions.filter(t => t.TransactionType === 'Payment').reduce((sum, t) => sum + Number(t.Amount), 0);
                return {
                    studentId: student.ID,
                    studentName: student.Name,
                    className: student.Class,
                    totalDue: totalCharges - totalPayments
                };
            });
        return this._simulateDelay(summaries);
    },
    getStudentLedger: function(studentId) {
        return this._simulateDelay(MOCK_DB.fees.filter(f => f.StudentID == studentId));
    },
    getReceiptData: function(invoiceNo) {
        return this._simulateDelay(MOCK_DB.fees.find(f => f.InvoiceNo === invoiceNo));
    },
    recordPayment: function(paymentData) {
        const lastInv = Math.max(...MOCK_DB.fees.map(f => parseInt(f.InvoiceNo.replace('INV', '') || 0)));
        const newInvoice = {
            InvoiceNo: `INV${(lastInv + 1).toString().padStart(5, '0')}`,
            StudentID: paymentData.studentId,
            Date: new Date(paymentData.paymentDate).toISOString(),
            Description: `Payment Received (${paymentData.paymentMode})`,
            Amount: paymentData.amount,
            TransactionType: 'Payment',
            PaymentMode: paymentData.paymentMode
        };
        MOCK_DB.fees.push(newInvoice);
        return this._simulateDelay({ success: true, invoiceData: newInvoice });
    },

    // MARKS
    getMarksForClass: function(className, term, subject) {
        const marks = MOCK_DB.marks.filter(m => m.Class === className && m.Term === term && m.Subject === subject);
        return this._simulateDelay(marks.reduce((acc, m) => {
            acc[m.StudentID] = m.Marks;
            return acc;
        }, {}));
    },
    getMarksForReport: function(studentId, className) {
        // This is a simplified version of the complex logic in your Code.gs
        const classInfo = MOCK_DB.classes.find(c => c.Class === className);
        if (!classInfo) return this._simulateDelay(null);
        const terms = JSON.parse(classInfo.Terms);
        const subjects = Object.keys(JSON.parse(classInfo.Subjects));
        const studentMarks = MOCK_DB.marks.filter(m => m.StudentID == studentId && m.Class === className);
        
        const reportData = {
            subjects: subjects.map(subjectName => {
                let marks = {};
                terms.forEach(term => {
                    const markEntry = studentMarks.find(m => m.Subject === subjectName && m.Term === term);
                    marks[term] = markEntry ? markEntry.Marks : '-';
                });
                return { subjectName, marks, total: '-', grade: '-' }; // Simplified for mock
            }),
            terms: terms
        };
        return this._simulateDelay(reportData);
    },

    // This is a placeholder for a much more complex server function
    getDashboardData: function() {
        return this._simulateDelay({
            totalStudents: MOCK_DB.students.filter(s => s.Status === 'Active').length,
            totalTeachers: 2, // Hardcoded
            totalDue: 0, // Simplified
            studentCountByClass: { "Class 5": 2, "Class 6": 1 }
        });
    }
};
