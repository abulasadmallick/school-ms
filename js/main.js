// Central function to show different sections
function showSection(section) {
  const contentDiv = document.getElementById('mainContent');
  contentDiv.innerHTML = '<div class="d-flex justify-content-center p-5"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';

  const navbarCollapse = document.querySelector('.navbar-collapse.show');
  if (navbarCollapse) {
    new bootstrap.Collapse(navbarCollapse).hide();
  }

  // A simple router
  switch (section) {
    case 'dashboard': loadDashboard(); break;
    case 'students': loadStudents(); break;
    case 'attendance': loadAttendance(); break;
    case 'settings': loadSettings(); break;
    case 'marks': loadMarksUI(); break;
    case 'fees': loadFees(); break;
    case 'promotion': loadPromotionUI(); break;
  }
}

// Helper to format date strings from DD.MM.YYYY to YYYY-MM-DD
function formatDateForInput(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const parts = dateStr.split('.');
    return parts.length !== 3 ? '' : `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// Helper for action buttons in tables
function getActionButtons(type, id) {
    const user = JSON.parse(sessionStorage.getItem('user'));
    const userRole = user ? user.role : '';
    let buttons = '';
    if (type === 'Student') {
        buttons += `<button class="btn btn-sm btn-info" onclick="viewStudent('${id}')" title="View"><i class="fas fa-eye"></i></button>`;
        buttons += ` <button class="btn btn-sm btn-secondary" onclick="generateCertificate('${id}')" title="Character Certificate"><i class="fas fa-stamp"></i></button>`;
        if (userRole === 'admin') {
            buttons += `<button class="btn btn-sm btn-warning" onclick="editStudent('${id}')" title="Edit"><i class="fas fa-edit"></i></button>`;
            buttons += `<button class="btn btn-sm btn-danger" onclick="deleteStudent('${id}')" title="Delete"><i class="fas fa-trash"></i></button>`;
        }
    }
    return `<div class="btn-group">${buttons}</div>`;
}


// Dashboard Functions
async function loadDashboard() {
    try {
        const data = await api.getDashboardData();
        let html = `
            <div class="row">
                <div class="col-md-4 mb-3"><div class="card p-3"><div class="card-body"><h4>Total Students</h4><p class="fs-2">${data.totalStudents}</p></div></div></div>
                <div class="col-md-4 mb-3"><div class="card p-3"><div class="card-body"><h4>Total Teachers</h4><p class="fs-2">${data.totalTeachers}</p></div></div></div>
                <div class="col-md-4 mb-3"><div class="card p-3"><div class="card-body"><h4>Total Due Amount</h4><p class="fs-2">₹ ${data.totalDue.toLocaleString('en-IN')}</p></div></div></div>
            </div>
            <div class="card mt-3"><div class="card-header">Student Distribution by Class</div><div class="card-body"><div id="chart_div" style="height: 300px;"></div></div></div>`;
        $('#mainContent').html(html);

        google.charts.load('current', {'packages':['corechart']});
        google.charts.setOnLoadCallback(() => drawChart(data.studentCountByClass));
    } catch (e) {
        $('#mainContent').html(`<div class="alert alert-danger">Failed to load dashboard.</div>`);
    }
}
function drawChart(chartData) {
    const dataArray = [['Class', 'Number of Students'], ...Object.entries(chartData)];
    const data = google.visualization.arrayToDataTable(dataArray);
    const options = { title: 'Students per Class', pieHole: 0.4 };
    const chart = new google.visualization.PieChart(document.getElementById('chart_div'));
    chart.draw(data, options);
}

// Student Functions
async function loadStudents() {
    try {
        const user = JSON.parse(sessionStorage.getItem('user'));
        const students = await api.getStudents();
        let tableRows = students.map(s => `
            <tr class="align-middle">
                <td>${s.ID}</td><td>${s.RollNo || ''}</td><td>${s.Name}</td><td>${s.Class}</td><td>${s.Section}</td>
                <td>${s.ParentName}</td><td>${s.Contact}</td>
                <td><span class="badge bg-${s.Status === 'Active' ? 'success' : 'danger'}">${s.Status}</span></td>
                <td>${getActionButtons('Student', s.ID)}</td>
            </tr>`).join('');

        let html = `
            <div class="card">
                <div class="card-header d-flex justify-content-between">
                    <span>Students</span>
                    ${user.role === 'admin' ? `<button class="btn btn-primary btn-sm" onclick="showStudentForm()">Add Student</button>` : ''}
                </div>
                <div class="card-body"><div class="table-responsive"><table class="table table-hover" id="studentsTable">
                    <thead><tr><th>ID</th><th>Roll No.</th><th>Name</th><th>Class</th><th>Section</th><th>Parent</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>${tableRows}</tbody>
                </table></div></div>
            </div>`;
        $('#mainContent').html(html);
        $('#studentsTable').DataTable();
    } catch (e) {
        $('#mainContent').html(`<div class="alert alert-danger">Failed to load students.</div>`);
    }
}
async function viewStudent(studentId) {
    const s = await api.getStudent(studentId);
    const detailsHtml = `
        <p><strong>ID:</strong> ${s.ID}</p><p><strong>Name:</strong> ${s.Name}</p>
        <p><strong>Class:</strong> ${s.Class} - ${s.Section}</p><p><strong>Parent:</strong> ${s.ParentName} (${s.Contact})</p>
        <p><strong>Admission Date:</strong> ${s.AdmissionDate}</p>`;
    const modalHtml = `
    <div class="modal fade" id="viewModal"><div class="modal-dialog"><div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Student Details</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body">${detailsHtml}</div>
    </div></div></div>`;
    $('#viewModal').remove();
    $('body').append(modalHtml);
    new bootstrap.Modal($('#viewModal')[0]).show();
}

// Fees Functions
async function loadFees() {
    try {
        const summaries = await api.getFeeSummariesAndChargeStudents();
        let rows = summaries.map(s => {
            const balance = s.totalDue;
            let balanceBadge = balance > 0 ? `<span class="badge bg-danger">₹ ${balance.toLocaleString('en-IN')} Due</span>`
                             : balance < 0 ? `<span class="badge bg-success">₹ ${Math.abs(balance).toLocaleString('en-IN')} Advance</span>`
                             : `<span class="badge bg-secondary">₹ 0 Cleared</span>`;

            return `<tr><td>${s.studentName}</td><td>${s.className}</td><td>${balanceBadge}</td>
                <td><div class="btn-group">
                    <button class="btn btn-sm btn-primary" onclick="showPaymentModal('${s.studentId}', '${s.studentName}', ${s.totalDue})">Make Payment</button>
                    <button class="btn btn-sm btn-info" onclick="showStudentLedger('${s.studentId}', '${s.studentName}')">View Ledger</button>
                </div></td></tr>`;
        }).join('');
        const html = `<div class="card"><div class="card-header">Student Fee Balances</div><div class="card-body">
            <div class="table-responsive"><table class="table" id="feesSummaryTable">
                <thead><tr><th>Student</th><th>Class</th><th>Balance</th><th>Actions</th></tr></thead>
                <tbody>${rows}</tbody>
            </table></div></div></div>`;
        $('#mainContent').html(html);
        $('#feesSummaryTable').DataTable();
    } catch(e) {
        $('#mainContent').html(`<div class="alert alert-danger">Failed to load fee summaries.</div>`);
    }
}

function showPaymentModal(studentId, studentName, totalDue) {
    const modalHtml = `
    <div class="modal fade" id="paymentModal"><div class="modal-dialog"><div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Record Payment</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body">
        <p><strong>Student:</strong> ${studentName} (${studentId})</p>
        <p><strong>Current Balance:</strong> ₹ ${totalDue.toLocaleString('en-IN')}</p>
        <div class="mb-3"><label class="form-label">Amount</label><input id="paymentAmount" type="number" class="form-control"></div>
        <div class="mb-3"><label class="form-label">Payment Mode</label><select id="paymentMode" class="form-select"><option>Cash</option><option>Online</option></select></div>
        <div class="mb-3"><label class="form-label">Payment Date</label><input id="paymentDate" type="date" class="form-control" value="${new Date().toISOString().split('T')[0]}"></div>
      </div>
      <div class="modal-footer"><button class="btn btn-primary" onclick="submitNewPayment('${studentId}')">Submit & Print</button></div>
    </div></div></div>`;
    $('#paymentModal').remove();
    $('body').append(modalHtml);
    new bootstrap.Modal($('#paymentModal')[0]).show();
}

async function submitNewPayment(studentId) {
    const paymentData = {
        studentId: studentId,
        amount: $('#paymentAmount').val(),
        paymentMode: $('#paymentMode').val(),
        paymentDate: $('#paymentDate').val()
    };
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0 || !paymentData.paymentDate) {
        alert('Please enter a valid amount and date.');
        return;
    }
    try {
        const result = await api.recordPayment(paymentData);
        bootstrap.Modal.getInstance($('#paymentModal')).hide();
        await printReceipt(result.invoiceData);
        loadFees(); 
    } catch(e) {
        alert('Error recording payment.');
    }
}

async function showStudentLedger(studentId, studentName) {
    const transactions = await api.getStudentLedger(studentId);
    let balance = 0;
    let rows = transactions.map(t => {
        let debit = '', credit = '', actions = '';
        if (t.TransactionType === 'Charge') {
            debit = `₹ ${Number(t.Amount).toLocaleString('en-IN')}`;
            balance += Number(t.Amount);
        } else {
            credit = `₹ ${Number(t.Amount).toLocaleString('en-IN')}`;
            balance -= Number(t.Amount);
            actions = `<button class="btn btn-sm btn-outline-secondary" onclick="reprintReceipt('${t.InvoiceNo}')" title="Print Receipt"><i class="fas fa-print"></i></button>`;
        }
        return `<tr>
            <td>${new Date(t.Date).toLocaleDateString('en-IN')}</td>
            <td>${t.Description}</td><td class="text-danger">${debit}</td><td class="text-success">${credit}</td>
            <td>₹ ${balance.toLocaleString('en-IN')}</td><td>${actions}</td>
        </tr>`;
    }).join('');
    const modalHtml = `
    <div class="modal fade" id="ledgerModal"><div class="modal-dialog modal-xl"><div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Fee Ledger for ${studentName}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body"><div class="table-responsive"><table class="table">
        <thead><tr><th>Date</th><th>Description</th><th>Charged</th><th>Paid</th><th>Balance</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div></div>
    </div></div></div>`;
    $('#ledgerModal').remove();
    $('body').append(modalHtml);
    new bootstrap.Modal($('#ledgerModal')[0]).show();
}

async function reprintReceipt(invoiceNo) {
    const receiptData = await api.getReceiptData(invoiceNo);
    await printReceipt(receiptData);
}

// Marksheet Functions
async function loadMarksUI() {
    const classes = await api.getClasses();
    let classOptions = '<option value="">-- Select Class --</option>' + classes.map(c => `<option value='${JSON.stringify(c)}'>${c.Class}</option>`).join('');
    const html = `
    <div class="row">
        <div class="col-md-7 mb-3"><div class="card h-100"><div class="card-header">Class-wise Marks Entry</div><div class="card-body"><div class="row g-3 align-items-end">
            <div class="col-md-4"><label>1. Select Class</label><select id="marksClassSelect" class="form-select">${classOptions}</select></div>
            <div class="col-md-3"><label>2. Select Term</label><select id="marksTermSelect" class="form-select" disabled></select></div>
            <div class="col-md-3"><label>3. Select Subject</label><select id="marksSubjectSelect" class="form-select" disabled></select></div>
            <div class="col-md-2"><button class="btn btn-primary w-100" onclick="fetchStudentsForMarksEntry()">Enter</button></div>
        </div></div></div></div>
        <div class="col-md-5 mb-3"><div class="card h-100"><div class="card-header">Generate Marksheet</div><div class="card-body">
            <label>Select Class</label><select id="generateMarksheetClassSelect" class="form-select mb-2">${classOptions}</select>
            <div class="row g-2">
                <div class="col-md-8"><label>Select Student</label><select id="generateStudentSelect" class="form-select" disabled></select></div>
                <div class="col-md-4 d-flex align-items-end"><button class="btn btn-info w-100" onclick="generateSingleMarksheet()">For Student</button></div>
            </div><hr><button class="btn btn-success w-100" onclick="generateBulkMarksheets()">For Entire Class</button>
        </div></div></div>
    </div><div id="marksEntryList" class="mt-3"></div>`;
    $('#mainContent').html(html);

    $('#marksClassSelect').on('change', function() {
        const data = $(this).val();
        $('#marksTermSelect, #marksSubjectSelect').html('').prop('disabled', true);
        if (data) {
            const info = JSON.parse(data);
            $('#marksTermSelect').html(JSON.parse(info.Terms).map(t => `<option value="${t}">${t}</option>`).join('')).prop('disabled', false);
            $('#marksSubjectSelect').html(Object.keys(JSON.parse(info.Subjects)).map(s => `<option value="${s}">${s}</option>`).join('')).prop('disabled', false);
        }
    });
    $('#generateMarksheetClassSelect').on('change', async function() {
        const data = $(this).val();
        $('#generateStudentSelect').html('').prop('disabled', true);
        if (data) {
            const info = JSON.parse(data);
            const students = await api.getStudentsByClass(info.Class);
            $('#generateStudentSelect').html(students.map(s => `<option value="${s.ID}">${s.Name} (${s.ID})</option>`).join('')).prop('disabled', false);
        }
    });
}

// Helper function to fetch and populate templates
async function populateTemplate(url, data) {
    const response = await fetch(url);
    let template = await response.text();
    for (const key in data) {
        // This is a very simplified templating engine for demonstration
        template = template.replace(new RegExp(`<%=\\s*${key}\\s*%>`, 'g'), data[key]);
    }
    return template;
}

async function printContent(htmlContent) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
}

async function printReceipt(receiptData) {
    const student = await api.getStudent(receiptData.StudentID);
    const ledger = await api.getStudentLedger(receiptData.StudentID);
    const totalCharges = ledger.filter(t => t.TransactionType === 'Charge').reduce((sum, t) => sum + Number(t.Amount), 0);
    const totalPayments = ledger.filter(t => t.TransactionType === 'Payment').reduce((sum, t) => sum + Number(t.Amount), 0);
    const balance = totalCharges - totalPayments;

    // Fetch and populate the template
    const response = await fetch('templates/invoice_template.html');
    let html = await response.text();
    html = html.replace(/<\?=\s*receipt.InvoiceNo\s*\?>/g, receiptData.InvoiceNo)
               .replace(/<\?=\s*new Date\(receipt.Date\).toLocaleDateString\(\)\s*\?>/g, new Date(receiptData.Date).toLocaleDateString('en-IN'))
               .replace(/<\?=\s*student.Name\s*\?>/g, student.Name)
               .replace(/<\?=\s*student.ID\s*\?>/g, student.ID)
               .replace(/<\?=\s*student.Class\s*\?>/g, student.Class)
               .replace(/<\?=\s*student.Section\s*\?>/g, student.Section)
               .replace(/<\?=\s*receipt.Description\s*\?>/g, receiptData.Description)
               .replace(/<\?=\s*Number\(receipt.Amount\).toFixed\(2\)\s*\?>/g, Number(receiptData.Amount).toFixed(2))
               .replace(/<\?=\s*\(balance \+ Number\(receipt.Amount\)\).toFixed\(2\)\s*\?>/g, (balance + Number(receiptData.Amount)).toFixed(2))
               .replace(/<\?=\s*balance.toFixed\(2\)\s*\?>/g, balance.toFixed(2));

    printContent(html);
}

async function generateCertificate(studentId) {
    const student = await api.getStudent(studentId);
    const response = await fetch('templates/certificate_template.html');
    let html = await response.text();

    html = html.replace(/<\?=\s*student.Name\s*\?>/g, student.Name)
               .replace(/<\?=\s*student.ParentName\s*\?>/g, student.ParentName)
               .replace(/<\?=\s*student.Address\s*\?>/g, student.Address)
               .replace(/<\?=\s*student.ID\s*\?>/g, student.ID)
               .replace(/<\?=\s*student.Class\s*\?>/g, student.Class)
               .replace(/<\?=\s*issueDate\s*\?>/g, new Date().toLocaleDateString('en-GB'));
    
    printContent(html);
}

async function generateSingleMarksheet() {
    const studentId = $('#generateStudentSelect').val();
    const classDataString = $('#generateMarksheetClassSelect').val();
    if (!studentId || !classDataString) return alert('Please select a class and student.');
    
    const className = JSON.parse(classDataString).Class;
    const htmlContent = await getMarksheetHtml(studentId, className);
    if(htmlContent) printContent(htmlContent);
}

async function getMarksheetHtml(studentId, className) {
    const student = await api.getStudent(studentId);
    const reportData = await api.getMarksForReport(studentId, className);
    if (!student || !reportData) {
        alert("Could not generate marksheet data.");
        return null;
    }

    const response = await fetch('templates/marksheet_template.html');
    let template = await response.text();

    let termHeaders = reportData.terms.map(term => `<th>${term}</th>`).join('');
    let subjectRows = reportData.subjects.map(subject => {
        let termMarks = reportData.terms.map(term => `<td>${subject.marks[term]}</td>`).join('');
        return `<tr><td>${subject.subjectName}</td>${termMarks}<td>${subject.total}</td><td>${subject.grade}</td></tr>`;
    }).join('');

    return template
        .replace('<?= student.Name ?>', student.Name)
        .replace('<?= student.ID ?>', student.ID)
        .replace('<?= student.Class ?>', student.Class)
        .replace('<?= student.Section ?>', student.Section)
        .replace('<? reportData.terms.forEach(term => { ?>', '')
        .replace('<th><?= term ?></th>', termHeaders)
        .replace('<? }); ?>', '')
        .replace('<? reportData.subjects.forEach(subject => { ?>', '')
        .replace(/<\?=\s*subject.subjectName\s*\?>/g, '') // Complex replacements handled above
        .replace('<? }); ?>', subjectRows)
        .replace('<?= date ?>', new Date().toLocaleDateString('en-IN'));
}
