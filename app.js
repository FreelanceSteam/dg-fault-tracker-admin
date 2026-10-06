/* =====================================================
   DG FAULT TRACKER - GITHUB ADMIN APP
   Google Apps Script API
   ===================================================== */

const API_URL =
  "https://script.google.com/macros/s/AKfycbzY8la37LIrnj4T6Uy4lUL5DY21NzpLnaNfbg3TZST7KpaYTesaQ3qFbCqk8QsQSZT0PA/exec";


/* =====================================================
   GLOBAL DATA
   ===================================================== */

let faultRows = [];
let siteRows = [];
let technicianRows = [];

let siteChanges = {};
let technicianChanges = {};

// ===== LOAD CACHE =====
let dashboardLoaded = false;
let faultsLoaded = false;
let sitesLoaded = false;
let techniciansLoaded = false;
let technicianNamesLoaded = false;
let dashboardLoadingPromise = null;
let faultsLoadingPromise = null;
let sitesLoadingPromise = null;
let techniciansLoadingPromise = null;


/* =====================================================
   API - JSONP
   ===================================================== */

function apiGet(action, params = {}) {

  return new Promise(function(resolve, reject) {

    const callbackName =
      "dgApi_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 100000);

    const script =
      document.createElement("script");

    const query =
      new URLSearchParams();

    query.set("action", action);
    query.set("callback", callbackName);

    Object.keys(params).forEach(function(key) {

      if (
        params[key] !== undefined &&
        params[key] !== null
      ) {

        query.set(
          key,
          String(params[key])
        );

      }

    });

    let finished = false;

    const timeout =
      setTimeout(function() {

        if (finished) return;

        finished = true;

        cleanup();

        reject(
          new Error(
            "API request timed out."
          )
        );

      }, 30000);


    function cleanup() {

      clearTimeout(timeout);

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

      try {
        delete window[callbackName];
      } catch(e) {
        window[callbackName] = undefined;
      }

    }


    window[callbackName] =
      function(response) {

        if (finished) return;

        finished = true;

        cleanup();

        if (
          response &&
          response.success === false
        ) {

          reject(
            new Error(
              response.message ||
              "API error"
            )
          );

          return;

        }

        resolve(
          response &&
          response.data !== undefined
            ? response.data
            : response
        );

      };


    script.onerror =
      function() {

        if (finished) return;

        finished = true;

        cleanup();

        reject(
          new Error(
            "Unable to connect to Apps Script API."
          )
        );

      };


    script.src =
      API_URL +
      "?" +
      query.toString();

    document.body.appendChild(script);

  });

}


/* =====================================================
   TAB CONTROL
   ===================================================== */

function openTab(tabId, button) {

  document
    .querySelectorAll(".section")
    .forEach(function(section) {
      section.classList.remove("active");
    });

  document
    .querySelectorAll(".tab")
    .forEach(function(tab) {
      tab.classList.remove("active");
    });

  const section = document.getElementById(tabId);
  if (section) section.classList.add("active");

  if (button) button.classList.add("active");

  // IMPORTANT: tab switching uses cached data.
  // The Refresh buttons call these functions without the second argument
  // and therefore force a fresh API request.
  if (tabId === "dashboard") loadDashboard(false);
  if (tabId === "faults") loadFaults(false);
  if (tabId === "sites") loadSites(false);
  if (tabId === "technicians") loadTechnicians(false);
}


/* =====================================================
   DASHBOARD
   ===================================================== */

async function loadDashboard(forceRefresh = true) {

  if (!forceRefresh && dashboardLoaded) return;
  if (dashboardLoadingPromise) return dashboardLoadingPromise;

  dashboardLoadingPromise = (async function() {

  const loading =
    document.getElementById(
      "dashboardLoading"
    );

  const errorBox =
    document.getElementById(
      "dashboardError"
    );


  if (loading) {

    loading.style.display =
      "block";

    loading.textContent =
      "Loading dashboard...";

  }

  if (errorBox) {
    errorBox.style.display =
      "none";
  }


  try {

    const data =
      await apiGet("dashboard");


    setText(
      "totalFaults",
      data.totalFaults || 0
    );

    setText(
      "openFaults",
      data.open || 0
    );

    setText(
      "inProgressFaults",
      data.inProgress || 0
    );

    setText(
      "closedFaults",
      data.closed || 0
    );

    setText(
      "waitingMaterial",
      data.waitingMaterial || 0
    );

    setText(
      "waitingVendor",
      data.waitingVendor || 0
    );

    setText(
      "totalSites",
      data.totalSites || 0
    );

    setText(
      "totalTechnicians",
      data.totalTechnicians || 0
    );


    setText(
      "summaryTotalFaults",
      data.totalFaults || 0
    );

    setText(
      "summaryOpen",
      data.open || 0
    );

    setText(
      "summaryClosed",
      data.closed || 0
    );


    const pending =
      Number(data.totalFaults || 0) -
      Number(data.closed || 0);

    setText(
      "summaryPending",
      pending < 0 ? 0 : pending
    );

    dashboardLoaded = true;

  } catch(error) {

    console.error(
      "Dashboard error:",
      error
    );

    if (errorBox) {

      errorBox.style.display =
        "block";

      errorBox.textContent =
        "Dashboard Error: " +
        (
          error.message ||
          error
        );

    }

  } finally {

    if (loading) {
      loading.style.display =
        "none";
    }

    dashboardLoadingPromise = null;
  }

  })();

  return dashboardLoadingPromise;
}


/* =====================================================
   FAULT TRACKER
   ===================================================== */

async function loadFaults(forceRefresh = true) {

  if (!forceRefresh && faultsLoaded) return;
  if (faultsLoadingPromise) return faultsLoadingPromise;

  faultsLoadingPromise = (async function() {

  const body =
    document.getElementById(
      "faultBody"
    );

  const head =
    document.getElementById(
      "faultHead"
    );

  const loading =
    document.getElementById(
      "faultLoading"
    );


  if (loading) {
    loading.style.display =
      "block";
    loading.textContent =
      "Loading faults...";
  }


  if (body) {
    body.innerHTML = "";
  }


  try {

    const data =
      await apiGet("faults");


    faultRows =
      Array.isArray(data)
        ? data
        : (
            data &&
            Array.isArray(data.rows)
              ? data.rows
              : []
          );


    renderFaultHeader();

    populateFaultTechnicianFilter();

    renderFaults(faultRows);
    faultsLoaded = true;

  } catch(error) {

    console.error(
      "Fault loading error:",
      error
    );

    if (body) {

      body.innerHTML =
        '<tr><td colspan="10" class="error">' +
        escapeHtml(
          error.message || error
        ) +
        '</td></tr>';

    }

  } finally {

    if (loading) {
      loading.style.display =
        "none";
    }

    faultsLoadingPromise = null;
  }

  })();

  return faultsLoadingPromise;
}


function renderFaultHeader() {

  const head =
    document.getElementById(
      "faultHead"
    );

  if (!head) return;


  const columns = [
    "Entry Date",
    "Technician",
    "Site",
    "DG Make",
    "DG KVA",
    "Fault",
    "Remark",
    "Docket",
    "Fault Date",
    "Status"
  ];


  head.innerHTML =
    "<tr>" +
    columns.map(function(col) {

      return (
        "<th>" +
        escapeHtml(col) +
        "</th>"
      );

    }).join("") +
    "</tr>";

}


function populateFaultTechnicianFilter() {

  const select =
    document.getElementById(
      "faultTechnicianFilter"
    );

  if (!select) return;


  const current =
    select.value;


  const technicians = [];


  faultRows.forEach(function(row) {

    const name =
      String(
        row.technician ||
        ""
      ).trim();

    if (
      name &&
      technicians.indexOf(name) === -1
    ) {

      technicians.push(name);

    }

  });


  technicians.sort();


  select.innerHTML =
    '<option value="">All Technicians</option>';


  technicians.forEach(function(name) {

    const option =
      document.createElement(
        "option"
      );

    option.value = name;
    option.textContent = name;

    select.appendChild(option);

  });


  if (
    technicians.indexOf(current) !== -1
  ) {

    select.value = current;

  }

}


function renderFaults(rows) {

  const body =
    document.getElementById(
      "faultBody"
    );

  if (!body) return;


  if (!rows.length) {

    body.innerHTML =
      '<tr><td colspan="10" class="loading">' +
      "No fault records found." +
      "</td></tr>";

    return;

  }


  body.innerHTML =
    rows.map(function(row) {

      const status =
        String(
          row.status ||
          "Open"
        ).trim();


      return (
        "<tr>" +

        "<td>" +
        escapeHtml(row.entryDate) +
        "</td>" +

        "<td>" +
        escapeHtml(row.technician) +
        "</td>" +

        "<td><strong>" +
        escapeHtml(row.site) +
        "</strong></td>" +

        "<td>" +
        escapeHtml(row.dgMake) +
        "</td>" +

        "<td>" +
        escapeHtml(row.dgKva) +
        "</td>" +

        "<td>" +
        escapeHtml(row.fault) +
        "</td>" +

        "<td>" +
        escapeHtml(row.remark) +
        "</td>" +

        "<td>" +
        escapeHtml(row.docket) +
        "</td>" +

        "<td>" +
        escapeHtml(row.faultDate) +
        "</td>" +

        "<td>" +

        '<select class="status" ' +
        'data-row="' +
        Number(row.rowNumber || 0) +
        '" ' +
        'onchange="updateFaultStatus(this)">' +

        statusOption(
          "Open",
          status
        ) +

        statusOption(
          "In Progress",
          status
        ) +

        statusOption(
          "Closed",
          status
        ) +

        statusOption(
          "Waiting for Material",
          status
        ) +

        statusOption(
          "Waiting for Vendor",
          status
        ) +

        "</select>" +

        "</td>" +

        "</tr>"
      );

    }).join("");

}


function statusOption(
  value,
  current
) {

  return (
    '<option value="' +
    escapeHtml(value) +
    '"' +
    (
      value.toLowerCase() ===
      current.toLowerCase()
        ? " selected"
        : ""
    ) +
    ">" +
    escapeHtml(value) +
    "</option>"
  );

}


function filterFaults() {

  const search =
    String(
      document.getElementById(
        "faultSearch"
      )?.value || ""
    )
      .toLowerCase()
      .trim();


  const technician =
    String(
      document.getElementById(
        "faultTechnicianFilter"
      )?.value || ""
    )
      .toLowerCase()
      .trim();


  const status =
    String(
      document.getElementById(
        "faultStatusFilter"
      )?.value || ""
    )
      .toLowerCase()
      .trim();


  const filtered =
    faultRows.filter(
      function(row) {

        const text =
          [
            row.entryDate,
            row.technician,
            row.site,
            row.dgMake,
            row.dgKva,
            row.fault,
            row.remark,
            row.docket,
            row.faultDate,
            row.status
          ]
            .join(" ")
            .toLowerCase();


        const techMatch =
          !technician ||
          String(
            row.technician || ""
          )
            .toLowerCase()
            .trim() === technician;


        const statusMatch =
          !status ||
          String(
            row.status || ""
          )
            .toLowerCase()
            .trim() === status;


        return (
          (!search || text.includes(search)) &&
          techMatch &&
          statusMatch
        );

      }
    );


  renderFaults(filtered);

}


async function updateFaultStatus(select) {

  const row =
    Number(
      select.dataset.row
    );

  const value =
    select.value;


  if (!row) {

    alert(
      "❌ Fault row number missing."
    );

    return;

  }


  const oldValue =
    select.dataset.oldValue ||
    "";


  select.dataset.oldValue =
    value;


  try {

    await apiGet(
      "updateFaultStatus",
      {
        row: row,
        value: value
      }
    );


    const found =
      faultRows.find(
        function(item) {

          return Number(
            item.rowNumber
          ) === row;

        }
      );


    if (found) {
      found.status = value;
    }


    alert(
      "✅ Fault status updated."
    );


    loadDashboard();


  } catch(error) {

    alert(
      "❌ Status update failed.\n\n" +
      (
        error.message ||
        error
      )
    );


    if (oldValue) {
      select.value = oldValue;
    }

  }

}


/* =====================================================
   SITE MASTER
   ===================================================== */

async function loadSites(forceRefresh = true) {

  if (!forceRefresh && sitesLoaded) return;
  if (sitesLoadingPromise) return sitesLoadingPromise;

  sitesLoadingPromise = (async function() {

  const body =
    document.getElementById(
      "siteBody"
    );

  const head =
    document.getElementById(
      "siteHead"
    );

  const loading =
    document.getElementById(
      "siteLoading"
    );


  siteChanges = {};


  if (loading) {
    loading.style.display =
      "block";
  }


  if (body) {
    body.innerHTML = "";
  }


  try {

    const data =
      await apiGet("sites");


    siteRows =
      Array.isArray(data)
        ? data
        : (
            data &&
            Array.isArray(data.rows)
              ? data.rows
              : []
          );


    if (head) {

      head.innerHTML =
        "<tr>" +
        "<th>SAP ID</th>" +
        "<th>Site Type</th>" +
        "<th>Technician</th>" +
        "</tr>";

    }


    renderSites(siteRows);
    sitesLoaded = true;

  } catch(error) {

    console.error(
      "Site loading error:",
      error
    );

    if (body) {

      body.innerHTML =
        '<tr><td colspan="3" class="error">' +
        escapeHtml(
          error.message || error
        ) +
        "</td></tr>";

    }

  } finally {

    if (loading) {
      loading.style.display =
        "none";
    }

    sitesLoadingPromise = null;
  }

  })();

  return sitesLoadingPromise;
}


async function loadTechnicianNames() {

  // Reuse technician data already loaded by Technician Links.
  if (technicianNamesLoaded && technicianRows.length) {
    return technicianRows;
  }

  if (techniciansLoadingPromise) {
    await techniciansLoadingPromise;
    return technicianRows;
  }

  try {

    const data = await apiGet("technicians");

    technicianRows = Array.isArray(data)
      ? data
      : (data && Array.isArray(data.rows) ? data.rows : []);

    technicianNamesLoaded = true;
    return technicianRows;

  } catch(error) {

    console.error("Technician list error:", error);
    return [];

  }

}


async function renderSites(rows) {

  const body =
    document.getElementById(
      "siteBody"
    );

  if (!body) return;


  if (!rows.length) {

    body.innerHTML =
      '<tr><td colspan="3" class="loading">' +
      "No sites found." +
      "</td></tr>";

    return;

  }


  const technicians =
    await loadTechnicianNames();


  const names =
    technicians
      .map(function(item) {

        return String(
          item.technician ||
          item.name ||
          ""
        ).trim();

      })
      .filter(Boolean);


  names.sort();


  body.innerHTML =
    rows.map(function(row) {

      const site =
        String(
          row.sapId ||
          row.site ||
          ""
        ).trim();


      const current =
        String(
          row.technician ||
          ""
        ).trim();


      let options =
        '<option value="">-- Unassigned --</option>';


      names.forEach(
        function(name) {

          options +=
            '<option value="' +
            escapeHtml(name) +
            '"' +
            (
              name === current
                ? " selected"
                : ""
            ) +
            ">" +
            escapeHtml(name) +
            "</option>";

        }
      );


      return (
        "<tr>" +

        "<td><strong>" +
        escapeHtml(site) +
        "</strong></td>" +

        "<td>" +
        escapeHtml(
          row.siteType ||
          ""
        ) +
        "</td>" +

        "<td>" +

        '<select ' +
        'data-site="' +
        escapeHtml(site) +
        '" ' +
        'onchange="markSiteChange(this)" ' +
        'style="padding:8px;border:1px solid #cbd5e1;border-radius:7px;min-width:190px">' +

        options +

        "</select>" +

        "</td>" +

        "</tr>"
      );

    }).join("");

}


function markSiteChange(select) {

  const site =
    select.dataset.site;

  siteChanges[site] =
    select.value;

}


function filterSites() {

  const q =
    String(
      document.getElementById(
        "siteSearch"
      )?.value || ""
    )
      .toLowerCase()
      .trim();


  const filtered =
    siteRows.filter(
      function(row) {

        const text =
          [
            row.sapId,
            row.siteType,
            row.technician
          ]
            .join(" ")
            .toLowerCase();


        return (
          !q ||
          text.includes(q)
        );

      }
    );


  renderSites(filtered);

}


async function saveSiteChanges() {

  const keys =
    Object.keys(
      siteChanges
    );


  if (!keys.length) {

    alert(
      "ℹ️ No site changes to save."
    );

    return;

  }


  let success = 0;
  let failed = 0;


  for (
    let i = 0;
    i < keys.length;
    i++
  ) {

    const site =
      keys[i];

    const technician =
      siteChanges[site];


    if (!technician) {

      failed++;

      continue;

    }


    try {

      await apiGet(
        "updateSiteTechnician",
        {
          pin: "",
          site: site,
          technician: technician
        }
      );

      success++;

    } catch(error) {

      console.error(
        "Site update failed:",
        error
      );

      failed++;

    }

  }


  siteChanges = {};


  alert(
    "✅ Site changes saved: " +
    success +
    "\n❌ Failed: " +
    failed
  );


  loadSites();

}


/* =====================================================
   TECHNICIAN LINKS
   ===================================================== */

async function loadTechnicians(forceRefresh = true) {

  if (!forceRefresh && techniciansLoaded) return;
  if (techniciansLoadingPromise) return techniciansLoadingPromise;

  techniciansLoadingPromise = (async function() {

  const body =
    document.getElementById(
      "techBody"
    );

  const head =
    document.getElementById(
      "techHead"
    );

  const loading =
    document.getElementById(
      "techLoading"
    );


  technicianChanges = {};


  if (loading) {
    loading.style.display =
      "block";
  }


  if (body) {
    body.innerHTML = "";
  }


  try {

    const data =
      await apiGet(
        "technicians"
      );


    technicianRows =
      Array.isArray(data)
        ? data
        : (
            data &&
            Array.isArray(data.rows)
              ? data.rows
              : []
          );


    if (head) {

      head.innerHTML =
        "<tr>" +

        "<th>Technician Name</th>" +
        "<th>Site Count</th>" +
        "<th>Token</th>" +
        "<th>Technician Link</th>" +

        "</tr>";

    }


    renderTechnicians(
      technicianRows
    );
    techniciansLoaded = true;
    technicianNamesLoaded = true;

  } catch(error) {

    console.error(
      "Technician loading error:",
      error
    );

    if (body) {

      body.innerHTML =
        '<tr><td colspan="4" class="error">' +
        escapeHtml(
          error.message || error
        ) +
        "</td></tr>";

    }

  } finally {

    if (loading) {
      loading.style.display =
        "none";
    }

    techniciansLoadingPromise = null;
  }

  })();

  return techniciansLoadingPromise;
}


function renderTechnicians(rows) {

  const body =
    document.getElementById(
      "techBody"
    );

  if (!body) return;


  if (!rows.length) {

    body.innerHTML =
      '<tr><td colspan="4" class="loading">' +
      "No technicians found." +
      "</td></tr>";

    return;

  }


  body.innerHTML =
    rows.map(
      function(row,index) {

        const name =
          String(
            row.technician ||
            row.name ||
            ""
          ).trim();


        const siteCount =
          row.siteCount ||
          0;


        const token =
          String(
            row.token ||
            ""
          );


        const link =
          String(
            row.link ||
            ""
          );


        return (

          "<tr>" +

          "<td>" +

          '<input type="text" ' +
          'value="' +
          escapeHtml(name) +
          '" ' +
          'data-index="' +
          index +
          '" ' +
          'onchange="markTechChange(this)" ' +
          'style="padding:8px;border:1px solid #cbd5e1;border-radius:7px;min-width:180px">' +

          "</td>" +

          "<td>" +
          escapeHtml(siteCount) +
          "</td>" +

          "<td>" +

          '<div style="max-width:260px;word-break:break-all;font-size:11px;color:#64748b">' +
          escapeHtml(token) +
          "</div>" +

          "</td>" +

          "<td>" +

          (
            link
              ? (
                  '<div class="link-box">' +
                  '<a href="' +
                  escapeAttribute(link) +
                  '" target="_blank">' +
                  escapeHtml(link) +
                  "</a>" +
                  "</div>"
                )
              : "-"
          ) +

          "</td>" +

          "</tr>"

        );

      }
    ).join("");

}


function markTechChange(input) {

  const index =
    Number(
      input.dataset.index
    );

  technicianChanges[index] =
    input.value.trim();

}


function filterTechnicians() {

  const q =
    String(
      document.getElementById(
        "techSearch"
      )?.value || ""
    )
      .toLowerCase()
      .trim();


  const filtered =
    technicianRows.filter(
      function(row) {

        const text =
          [
            row.technician,
            row.siteCount,
            row.token,
            row.link
          ]
            .join(" ")
            .toLowerCase();


        return (
          !q ||
          text.includes(q)
        );

      }
    );


  renderTechnicians(
    filtered
  );

}


async function saveTechnicianChanges() {

  const keys =
    Object.keys(
      technicianChanges
    );


  if (!keys.length) {

    alert(
      "ℹ️ No technician changes to save."
    );

    return;

  }


  let success = 0;
  let failed = 0;


  for (
    let i = 0;
    i < keys.length;
    i++
  ) {

    const index =
      Number(keys[i]);


    const row =
      technicianRows[index];


    if (!row) {

      failed++;

      continue;

    }


    const token =
      String(
        row.token ||
        ""
      );


    const name =
      String(
        technicianChanges[index] ||
        ""
      ).trim();


    if (!token || !name) {

      failed++;

      continue;

    }


    try {

      await apiGet(
        "updateTechnicianName",
        {
          token: token,
          name: name
        }
      );

      success++;

    } catch(error) {

      console.error(
        "Technician update failed:",
        error
      );

      failed++;

    }

  }


  technicianChanges = {};


  alert(
    "✅ Technician changes saved: " +
    success +
    "\n❌ Failed: " +
    failed
  );


  loadTechnicians();

}


/* =====================================================
   ADD NEW TECHNICIAN
   ===================================================== */

async function addTechnician() {

  const input =
    document.getElementById(
      "newTechnicianName"
    );

  const resultBox =
    document.getElementById(
      "newTechnicianResult"
    );


  const name =
    String(
      input?.value || ""
    ).trim();


  if (!name) {

    alert(
      "Please enter technician name."
    );

    return;

  }


  if (resultBox) {

    resultBox.innerHTML =
      '<div style="padding:12px;background:#eff6ff;color:#1d4ed8;border-radius:8px">' +
      "⏳ Adding technician..." +
      "</div>";

  }


  try {

    const result =
      await apiGet(
        "addNewTechnician",
        {
          name: name
        }
      );


    if (resultBox) {

      resultBox.innerHTML =

        '<div style="padding:14px;background:#dcfce7;color:#166534;border-radius:8px">' +

        "<strong>✅ Technician added successfully.</strong><br><br>" +

        "<b>Name:</b> " +
        escapeHtml(
          result.technicianName ||
          name
        ) +

        "<br><b>Token:</b> " +
        escapeHtml(
          result.token ||
          ""
        ) +

        "<br><br><b>Technician Link:</b><br>" +

        '<a href="' +
        escapeAttribute(
          result.link ||
          ""
        ) +
        '" target="_blank">' +

        escapeHtml(
          result.link ||
          ""
        ) +

        "</a>" +

        "</div>";

    }


    if (input) {
      input.value = "";
    }


    loadTechnicians();
    loadDashboard();


  } catch(error) {

    console.error(
      "Add technician error:",
      error
    );


    if (resultBox) {

      resultBox.innerHTML =
        '<div style="padding:14px;background:#fee2e2;color:#991b1b;border-radius:8px">' +
        "❌ " +
        escapeHtml(
          error.message ||
          error
        ) +
        "</div>";

    }

  }

}


/* =====================================================
   DASHBOARD EXCEL
   ===================================================== */

async function downloadDashboardExcel() {

  const btn =
    document.getElementById(
      "excelDashboardBtn"
    );


  if (btn) {

    btn.disabled = true;

    btn.innerText =
      "⏳ Preparing...";

  }


  try {

    const response =
      await apiGet(
        "dashboardExcel"
      );


    if (
      !response ||
      !response.base64
    ) {

      throw new Error(
        "Excel file data not received."
      );

    }


    const binary =
      atob(
        response.base64
      );


    const bytes =
      new Uint8Array(
        binary.length
      );


    for (
      let i = 0;
      i < binary.length;
      i++
    ) {

      bytes[i] =
        binary.charCodeAt(i);

    }


    const blob =
      new Blob(
        [bytes],
        {
          type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const a =
      document.createElement(
        "a"
      );


    a.href = url;

    a.download =
      "DG_Fault_Tracker_Admin_" +
      new Date()
        .toISOString()
        .slice(0,10) +
      ".xlsx";


    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);


  } catch(error) {

    console.error(
      "Excel error:",
      error
    );


    alert(
      "❌ Excel download failed.\n\n" +
      (
        error.message ||
        error
      )
    );

  } finally {

    if (btn) {

      btn.disabled = false;

      btn.innerText =
        "📥 Excel";

    }

  }

}


/* =====================================================
   HELPER FUNCTIONS
   ===================================================== */

function setText(
  id,
  value
) {

  const element =
    document.getElementById(id);

  if (element) {
    element.textContent =
      value;
  }

}


function escapeHtml(value) {

  return String(
    value === undefined ||
    value === null
      ? ""
      : value
  )
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}


function escapeAttribute(value) {

  return String(
    value === undefined ||
    value === null
      ? ""
      : value
  )
    .replace(/&/g,"&amp;")
    .replace(/"/g,"&quot;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");

}


/* =====================================================
   INITIAL LOAD
   ===================================================== */

window.addEventListener(
  "load",
  function() {

    loadDashboard();

  }
);
/* =====================================================
   TABLE EXCEL DOWNLOAD
   ===================================================== */

function downloadTableExcel(tableId, fileName) {

  const table = document.getElementById(tableId);

  if (!table) {
    alert("❌ Data table not found.");
    return;
  }

  // Clone table so original screen is not affected
  const clone = table.cloneNode(true);

  // Convert SELECT controls to selected text
  clone.querySelectorAll("select").forEach(function(select) {

    const selectedText =
      select.options[select.selectedIndex]
        ? select.options[select.selectedIndex].text
        : "";

    const cell = select.parentElement;

    if (cell) {
      cell.textContent = selectedText;
    }
  });

  // Convert INPUT controls to their current values
  clone.querySelectorAll("input").forEach(function(input) {

    const value = input.value || "";

    const cell = input.parentElement;

    if (cell) {
      cell.textContent = value;
    }
  });

  // Remove buttons/actions from exported table
  clone.querySelectorAll("button").forEach(function(button) {
    button.remove();
  });

  const html =
    '<html>' +
    '<head>' +
    '<meta charset="UTF-8">' +
    '<style>' +
    'table{border-collapse:collapse;width:100%;}' +
    'th,td{border:1px solid #999;padding:6px;text-align:left;}' +
    'th{background:#0f172a;color:white;}' +
    '</style>' +
    '</head>' +
    '<body>' +
    clone.outerHTML +
    '</body>' +
    '</html>';

  const blob = new Blob(
    [html],
    {
      type: "application/vnd.ms-excel"
    }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  setTimeout(function() {
    URL.revokeObjectURL(url);
  }, 1000);
}
