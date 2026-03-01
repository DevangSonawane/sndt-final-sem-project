const apiURL = "http://localhost:3000";

// Get customer name from URL
const urlParams = new URLSearchParams(window.location.search);
const customerName = urlParams.get('customer_name');

document.addEventListener("DOMContentLoaded", function() {
    
    if (!customerName) {
        alert("No client selected. Redirecting...");
        window.location.href = "user.html";
        return;
    }

    document.getElementById("clientNameDisplay").innerText = customerName;

    // Fetch Analytics Data
    fetch(apiURL + "/analytics?customer_name=" + encodeURIComponent(customerName))
        .then(res => res.json())
        .then(data => {
            renderCharts(data);
        })
        .catch(err => {
            console.error("Error fetching analytics:", err);
            alert("Failed to load analytics data");
        });

});

function renderCharts(data) {
    
    // Process Data
    let fbCount = 0;
    let instaCount = 0;
    
    // Group by Date for Line Chart
    const dateMap = {};

    data.forEach(item => {
        if (item.platform === "Facebook") fbCount += item.count;
        if (item.platform === "Instagram") instaCount += item.count;

        // Format Date YYYY-MM-DD
        const dateStr = item.post_date ? item.post_date.split('T')[0] : 'Unknown';
        
        if (!dateMap[dateStr]) {
            dateMap[dateStr] = 0;
        }
        dateMap[dateStr] += item.count;
    });

    // Update Summary Stats
    document.getElementById("totalFbPosts").innerText = fbCount;
    document.getElementById("totalInstaPosts").innerText = instaCount;

    /* ================= PIE CHART ================= */
    const ctxPie = document.getElementById('platformChart').getContext('2d');
    new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Facebook', 'Instagram'],
            datasets: [{
                data: [fbCount, instaCount],
                backgroundColor: ['#1877F2', '#E1306C'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    /* ================= LINE CHART ================= */
    
    // Sort dates
    const sortedDates = Object.keys(dateMap).sort();
    const counts = sortedDates.map(d => dateMap[d]);

    // Format dates for display
    const displayDates = sortedDates.map(d => new Date(d).toLocaleDateString('en-GB'));

    const ctxLine = document.getElementById('activityChart').getContext('2d');
    new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: displayDates,
            datasets: [{
                label: 'Posts per Day',
                data: counts,
                borderColor: '#4e73df',
                backgroundColor: 'rgba(78, 115, 223, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}