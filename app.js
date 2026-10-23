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
let sitesLoaded = false;
let techniciansLoaded = false;
let technicianNamesLoaded = false;
let dashboardLoadingPromise = null;
let faultsLoaded = false;
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
    loadFaults(false).catch(function(error) {
      console.warn("Dashboard fault insights unavailable:", error);
    });

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


function populateDashboardFilterOptions(rows) {
  const fields = [{id:"dashIssue",key:"fault",placeholder:"All Issues"},{id:"dashStatus",key:"status",placeholder:"All Statuses"}];
  fields.forEach(function(field) {
    const el=document.getElementById(field.id); if(!el)return;
    const old=el.value;
    const values=[...new Set(rows.map(r=>String(r[field.key]||"").trim()).filter(Boolean))].sort();
    el.replaceChildren(new Option(field.placeholder,""),...values.map(v=>new Option(v,v)));
    if(values.includes(old))el.value=old;
  });
}
function parseDashboardDate(value) {
  const s=String(value||"").trim(); if(!s)return null;
  const d=new Date(s);return Number.isNaN(d.getTime())?null:d;
}
function applyDashboardFilters() {
  const get=id=>String(document.getElementById(id)?.value||"").trim().toLowerCase();
  const site=get("dashSite"),make=get("dashMake"),issue=get("dashIssue"),status=get("dashStatus");
  const from=get("dashFrom"),to=get("dashTo");
  const filtered=(Array.isArray(faultRows)?faultRows:[]).filter(function(r){
    if(site&&!String(r.site||"").toLowerCase().includes(site))return false;
    if(make&&String(r.dgMake||"").trim().toLowerCase()!==make)return false;
    if(issue&&String(r.fault||"").trim().toLowerCase()!==issue)return false;
    if(status&&String(r.status||"").trim().toLowerCase()!==status)return false;
    if(from||to){
      const d=parseDashboardDate(r.entryDate||r.faultDate);
      if(!d)return false;
      const date=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
      if(from&&date<new Date(from+"T00:00:00").getTime())return false;
      if(to&&date>new Date(to+"T00:00:00").getTime())return false;
    }
    return true;
  });
  renderDashboardFaultInsights(filtered);
  renderDashboardStatusChart(filtered);
  const count=document.getElementById("dashboardFilterCount");
  if(count)count.textContent="Showing "+filtered.length+" of "+faultRows.length+" fault records";
}
function clearDashboardFilters(){
  ["dashSite","dashMake","dashIssue","dashStatus","dashFrom","dashTo"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
  applyDashboardFilters();
}
function normalizeDashboardStatus(value){
  const raw=String(value||"Open").trim().replace(/\s+/g," ");
  const lower=raw.toLowerCase();
  const known={"open":"Open","in progress":"In Progress","closed":"Closed","waiting for material":"Waiting for Material","waiting material":"Waiting for Material","waiting for vendor":"Waiting for Vendor","waiting vendor":"Waiting for Vendor"};
  return known[lower]||raw;
}
function renderDashboardStatusChart(rows){
  const chart=document.getElementById("faultStatusDonut"),legend=document.getElementById("faultStatusLegend"),total=document.getElementById("donutTotal");
  if(!chart||!legend)return;
  const colors=["#ed5c5c","#0c69d9","#16a879","#e8a22e","#8d62d6","#7c8b9e"];
  const statuses=new Map();
  rows.forEach(r=>{const key=normalizeDashboardStatus(r.status);statuses.set(key,(statuses.get(key)||0)+1);});
  const entries=[...statuses.entries()].sort((a,b)=>b[1]-a[1]);
  let pos=0;const slices=entries.map(([name,count],i)=>{const start=pos;pos+=rows.length?count/rows.length*100:0;return colors[i%colors.length]+" "+start+"% "+pos+"%";});
  chart.style.background=slices.length?"conic-gradient("+slices.join(",")+")":"#e3e9f2";
  if(total)total.innerHTML=rows.length+'<small>FAULTS</small>';
  legend.innerHTML=entries.length?entries.map(([name,count],i)=>'<div class="status-legend-item"><span class="status-dot" style="background:'+colors[i%colors.length]+'"></span><span>'+escapeHtml(name)+'</span><strong>'+count+'</strong></div>').join(""):"No fault records match the selected filters.";
}

function renderDashboardFaultInsights(rows) {
  const makes = [
    { key: "Eicher", cls: "make-eicher" },
    { key: "Kirloskar", cls: "make-kirloskar" },
    { key: "M&M", cls: "make-mm" },
    { key: "Perfect", cls: "make-perfect" }
  ];
  const faultTypes = [
    "GCU", "DG PM", "DG Battery", "DG Contactor",
    "EB contactor", "Stop Solinoid", "DG pannel Faulty", "DG issue"
  ];
  const root = document.getElementById("dgMakeSummary");
  const recent = document.getElementById("recentFaultBody");
  const records = Array.isArray(rows) ? rows : [];

  if (root) {
    root.innerHTML = makes.map(function(make) {
      const matching = records.filter(function(row) {
        return String(row && row.dgMake || "").trim().toLowerCase() === make.key.toLowerCase();
      });
      const counts = faultTypes.map(function(type) {
        const count = matching.filter(function(row) {
          return String(row && row.fault || "").trim().toLowerCase() === type.toLowerCase();
        }).length;
        return '<div class="dg-make-row"><span>' + escapeHtml(type) + '</span><strong>' + count + '</strong></div>';
      }).join("");
      return '<div class="dg-make-column ' + make.cls + '">' +
        '<div class="dg-make-top"><span class="dg-make-title">' + escapeHtml(make.key) + '</span>' +
        '<span class="dg-make-total"><small>TOTAL</small><strong>' + matching.length + '</strong></span></div>' +
        '<div class="dg-make-rows">' + counts + '</div></div>';
    }).join("");
  }

  if (recent) {
    const latest = records.slice().reverse().slice(0, 5);
    if (!latest.length) {
      recent.innerHTML = '<tr><td colspan="5">No fault records available.</td></tr>';
    } else {
      recent.innerHTML = latest.map(function(row) {
        const status = String(row.status || "Open");
        const normalized = status.toLowerCase();
        let statusClass = "recent-status";
        if (normalized === "closed") statusClass += " closed";
        else if (normalized.indexOf("progress") >= 0) statusClass += " progress";
        else if (normalized.indexOf("waiting") >= 0) statusClass += " waiting";
        else if (normalized === "open") statusClass += " open";
        return '<tr><td>' + escapeHtml(row.entryDate || row.faultDate || "—") +
          '</td><td>' + escapeHtml(row.site || "—") +
          '</td><td>' + escapeHtml(row.dgMake || "—") +
          '</td><td>' + escapeHtml(row.fault || "—") +
          '</td><td><span class="' + statusClass + '">' + escapeHtml(status) + '</span></td></tr>';
      }).join("");
    }
  }
}

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
    populateDashboardFilterOptions(faultRows);
    applyDashboardFilters();
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
"Closure Date",
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
  const body = document.getElementById("faultBody");

  if (!body) return;

  if (!rows.length) {
    body.innerHTML =
      '<tr><td colspan="10" style="text-align:center;padding:20px;color:#64748b;">No fault records found.</td></tr>';
    return;
  }

  body.innerHTML = rows.map(function(row) {

    const status = String(row.status || "Open").trim();
    const rowNumber = Number(row.rowNumber || 0);

    return (
      "<tr>" +

      "<td>" + escapeHtml(row.entryDate || "") + "</td>" +
      "<td>" + escapeHtml(row.technician || "") + "</td>" +
      "<td>" + escapeHtml(row.site || "") + "</td>" +
      "<td>" + escapeHtml(row.dgMake || "") + "</td>" +
      "<td>" + escapeHtml(row.dgKva || "") + "</td>" +
      "<td>" + escapeHtml(row.fault || "") + "</td>" +
      "<td>" + escapeHtml(row.remark || "") + "</td>" +
      "<td>" + escapeHtml(row.docket || "") + "</td>" +
      "<td>" + escapeHtml(row.faultDate || "") + "</td>" +
"<td>" + escapeHtml(row.closureDate || "") + "</td>" +
      "<td>" +
        '<div style="display:flex;align-items:center;gap:6px;white-space:nowrap;">' +

          '<select class="status ' + getFaultStatusClass(status) + '" ' +
          'data-row="' + rowNumber + '" ' +
          'data-old-value="' + escapeHtml(status) + '" ' +
          'onchange="markFaultStatusChange(this)">' +

            statusOption("Open", status) +
            statusOption("In Progress", status) +
            statusOption("Closed", status) +
            statusOption("Waiting for Material", status) +
            statusOption("Waiting for Vendor", status) +

          "</select>" +

          '<button type="button" ' +
          'class="btn btn-green fault-save-btn" ' +
          'data-row="' + rowNumber + '" ' +
          'onclick="saveFaultStatus(this)" ' +
          'disabled ' +
          'style="padding:6px 9px;font-size:11px;">' +
          "💾 Save" +
          "</button>" +

        "</div>" +
      "</td>" +

      "</tr>"
    );

  }).join("");
}
function markFaultStatusChange(select) {

  const oldValue = select.dataset.oldValue || "";

  const saveButton =
    select.parentElement.querySelector(".fault-save-btn");

  if (!saveButton) return;

  if (select.value === oldValue) {
    saveButton.disabled = true;
  } else {
    saveButton.disabled = false;
  }
}
function getFaultStatusClass(status) {

  const value = String(status || "")
    .trim()
    .toLowerCase();

  if (value === "open") {
    return "status-open";
  }

  if (value === "in progress") {
    return "status-progress";
  }

  if (value === "closed") {
    return "status-closed";
  }

  if (value === "waiting for material") {
    return "status-material";
  }

  if (value === "waiting for vendor") {
    return "status-vendor";
  }

  return "";
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
row.closureDate,
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

async function saveFaultStatus(button) {

  const row = Number(button.dataset.row);

  const select =
    button.parentElement.querySelector(".status");

  if (!row || !select) {
    alert("❌ Fault row number missing.");
    return;
  }

  const value = select.value;
  const oldValue = select.dataset.oldValue || "";

  if (value === oldValue) {
    button.disabled = true;
    return;
  }

  button.disabled = true;
  button.innerText = "Saving...";

  try {

    await apiGet("updateFaultStatus", {
      row: row,
      value: value
    });

    const found = faultRows.find(function(item) {
      return Number(item.rowNumber) === row;
    });

    if (found) {
      found.status = value;
    }

    select.dataset.oldValue = value;

    button.innerText = "✅ Saved";

    loadDashboard();

    setTimeout(function() {
      button.innerText = "💾 Save";
      button.disabled = true;
    }, 1500);

  } catch (error) {

    alert(
      "❌ Status update failed.\n\n" +
      (error.message || error)
    );

    select.value = oldValue;

    button.innerText = "💾 Save";
    button.disabled = true;
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

function getSiteTypeClass(type) {

  const value =
    String(type || "")
      .trim()
      .toLowerCase();

  if (value === "css") {
    return "site-type-css";
  }

  if (value === "indoor") {
    return "site-type-indoor";
  }

  if (value === "outdoor") {
    return "site-type-outdoor";
  }

  if (value === "shared") {
    return "site-type-shared";
  }

  if (value.startsWith("mag")) {
    return "site-type-mag";
  }

  if (value === "ibs") {
    return "site-type-ibs";
  }

  return "site-type-default";
}
async function renderSites(rows) {

  const body =
    document.getElementById(
      "siteBody"
    );

  if (!body) return;


  if (!rows.length) {
if (document.getElementById("siteTotalCount")) {
  document.getElementById("siteTotalCount").innerText = "0";
}

if (document.getElementById("siteTechnicianCount")) {
  document.getElementById("siteTechnicianCount").innerText = "0";
}
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
// SITE MASTER SUMMARY COUNTS

const siteTotalCount =
  document.getElementById("siteTotalCount");

const siteTechnicianCount =
  document.getElementById("siteTechnicianCount");

if (siteTotalCount) {
  siteTotalCount.innerText =
    rows.length;
}

if (siteTechnicianCount) {
  siteTechnicianCount.innerText =
    new Set(names).size;
}

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

        "<td><strong class=\"site-id\">" +
escapeHtml(site) +
"</strong></td>" +

        "<td>" +
"<span class=\"site-type-badge " +
getSiteTypeClass(row.siteType) +
"\">" +
escapeHtml(
  row.siteType ||
  ""
) +
"</span>" +
"</td>" +

        "<td>" +

        '<select ' +
        'data-site="' +
        escapeHtml(site) +
        '" ' +
        'onchange="markSiteChange(this)" ' +
        'class="site-tech-select">' +

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
         "<th>Action</th>" +

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
      '<tr><td colspan="5" class="loading">' +
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
          "<td>" +
            '<button type="button" ' +
            'data-name="' + escapeHtml(name) + '" ' +
            'onclick="deleteTechnicianRow(this.dataset.name)" ' +
            'style="background:#dc2626;color:white;border:0;' +
            'padding:6px 10px;border-radius:6px;cursor:pointer">' +
            "Delete" +
            "</button>" +
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
  const btn = document.getElementById("excelDashboardBtn");
  if (btn) { btn.disabled = true; btn.innerText = "⏳ Preparing..."; }
  try {
    if (typeof XLSX === "undefined") throw new Error("Excel library is not loaded. Please refresh the page.");
    if (!faultsLoaded) await loadFaults(true);
    const records = Array.isArray(faultRows) ? faultRows : [];
    const val = id => (document.getElementById(id)?.textContent || "0").trim();
    const generated = new Date();
    const kpis = [
      ["DG FAULT TRACKER - ADMIN DASHBOARD", ""],
      ["Generated At", generated.toLocaleString()],
      ["Metric", "Value"],
      ["Total Faults", val("totalFaults")],
      ["Open Faults", val("openFaults")],
      ["In Progress", val("inProgressFaults")],
      ["Closed Faults", val("closedFaults")],
      ["Waiting Material", val("waitingMaterial")],
      ["Waiting Vendor", val("waitingVendor")],
      ["Total Sites", val("totalSites")],
      ["Technicians", val("totalTechnicians")]
    ];
    const faultHeaders = ["Entry Date","Technician","Site ID","DG Make","DG KVA","Fault Type","Remark","Docket","Fault Date","Closure Date","Status"];
    const faultData = records.map(r => [r.entryDate||"",r.technician||"",r.site||"",r.dgMake||"",r.dgKva||"",r.fault||"",r.remark||"",String(r.docket||""),r.faultDate||"",r.closureDate||"",r.status||"Open"]);
    const makes = ["Eicher","Kirloskar","M&M","Perfect"];
    const types = ["GCU","DG PM","DG Battery","DG Contactor","EB contactor","Stop Solinoid","DG pannel Faulty","DG issue"];
    const norm = v => String(v||"").trim().toLowerCase().replace(/\s+/g," ");
    const makeRows = [["DG Make","Total Faults",...types]];
    makes.forEach(make => {
      const subset = records.filter(r => norm(r.dgMake) === norm(make));
      makeRows.push([make,subset.length,...types.map(t => subset.filter(r => norm(r.fault)===norm(t)).length)]);
    });
    const recent = [["Entry Date","Site ID","DG Make","Issue","Status"]].concat(records.slice().reverse().slice(0,50).map(r=>[r.entryDate||"",r.site||"",r.dgMake||"",r.fault||"",r.status||"Open"]));
    const wb = XLSX.utils.book_new();
    const navy = "082B63", blue = "0754C8", cyan = "00B8E6", yellow = "FFCA18";
    const white = "FFFFFF", pale = "EAF3FF", border = "C9DDF8", green = "008F5A";
    // Shared Excel border style must be in downloadDashboardExcel scope,
    // because KPI styling below addSheet() also uses it.
    const borderThin = {top:{style:"thin",color:{rgb:border}},bottom:{style:"thin",color:{rgb:border}},left:{style:"thin",color:{rgb:border}},right:{style:"thin",color:{rgb:border}}};
    const addSheet = (name, data, widths, opts = {}) => {
      const ws = XLSX.utils.aoa_to_sheet(data);
      if (widths) ws["!cols"] = widths.map(w => ({wch:w}));
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
      const cellStyle = (cell, style) => { if (cell && cell.t !== 'z') cell.s = style; };
      // Apply consistent dashboard-inspired typography, borders and alternating rows.
      for (let R=range.s.r; R<=range.e.r; R++) {
        for (let C=range.s.c; C<=range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({r:R,c:C});
          const cell = ws[addr]; if (!cell) continue;
          const baseStyle = {font:{name:"Aptos",sz:10,color:{rgb:"17365D"}},alignment:{vertical:"center",wrapText:true},border:borderThin,fill:{fgColor:{rgb:(R%2===0?"FFFFFF":"F2F7FF")}}};
          cellStyle(cell, baseStyle);
          if (R === 0) cellStyle(cell,{font:{name:"Aptos Display",sz:15,bold:true,color:{rgb:white}},fill:{fgColor:{rgb:navy}},alignment:{vertical:"center",horizontal:"left",wrapText:true},border:borderThin});
          if ((opts.headerRow !== undefined && R === opts.headerRow) || (opts.headerRow === undefined && R === 0 && !opts.titleRow)) {
            cellStyle(cell,{font:{name:"Aptos",sz:10,bold:true,color:{rgb:white}},fill:{fgColor:{rgb:blue}},alignment:{vertical:"center",horizontal:"center",wrapText:true},border:borderThin});
          }
        }
      }
      if (opts.titleRow) {
        for (let C=range.s.c; C<=range.e.c; C++) cellStyle(ws[XLSX.utils.encode_cell({r:0,c:C})],{font:{name:"Aptos Display",sz:16,bold:true,color:{rgb:white}},fill:{fgColor:{rgb:navy}},alignment:{vertical:"center",horizontal:"left"},border:borderThin});
        if (range.e.c>0) ws['!merges'] = (ws['!merges']||[]).concat([{s:{r:0,c:0},e:{r:0,c:range.e.c}}]);
      }
      if (opts.headerRow !== undefined) {
        const hr=opts.headerRow;
        for(let C=range.s.c;C<=range.e.c;C++) cellStyle(ws[XLSX.utils.encode_cell({r:hr,c:C})],{font:{name:"Aptos",sz:10,bold:true,color:{rgb:white}},fill:{fgColor:{rgb:blue}},alignment:{vertical:"center",horizontal:"center",wrapText:true},border:borderThin});
        ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:hr,c:range.s.c},e:{r:range.e.r,c:range.e.c}})};
        ws['!freeze']={xSplit:0,ySplit:hr+1,topLeftCell:XLSX.utils.encode_cell({r:hr+1,c:0}),activePane:"bottomLeft",state:"frozen"};
      }
      ws['!rows'] = Array.from({length:range.e.r+1},(_,r)=>({hpt:(opts.titleRow&&r===0)?30:((opts.headerRow!==undefined&&r===opts.headerRow)?25:20)}));
      XLSX.utils.book_append_sheet(wb,ws,name);
      return ws;
    };
    const summaryWs = addSheet("Dashboard Summary", kpis, [32,34], {titleRow:true,headerRow:2});
    // Highlight dashboard KPI values and labels.
    for (let R=3; R<kpis.length; R++) {
      const a=XLSX.utils.encode_cell({r:R,c:0}), b=XLSX.utils.encode_cell({r:R,c:1});
      if(summaryWs[a]) summaryWs[a].s={font:{name:"Aptos",sz:10,bold:true,color:{rgb:navy}},fill:{fgColor:{rgb:"EAF3FF"}},border:borderThin,alignment:{vertical:"center"}};
      if(summaryWs[b]) summaryWs[b].s={font:{name:"Aptos",sz:12,bold:true,color:{rgb:blue}},fill:{fgColor:{rgb:"FFF5CC"}},border:borderThin,alignment:{vertical:"center",horizontal:"center"}};
    }
    addSheet("All Fault Records", [faultHeaders,...faultData], [20,24,22,16,10,24,42,22,18,18,24], {headerRow:0});
    addSheet("DG Make Summary", makeRows, [18,14,12,12,14,16,16,20,16,14], {headerRow:0});
    addSheet("Recent Faults", recent, [20,22,16,24,24], {headerRow:0});
    const fileName = "DG_Fault_Tracker_Admin_Full_" + generated.toISOString().slice(0,10) + ".xlsx";
    XLSX.writeFile(wb,fileName);
  } catch(error) {
    console.error("Full Excel export error:",error);
    alert("Excel export failed.\n\n" + (error.message || error));
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = "📥 Excel"; }
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
   REAL XLSX TABLE DOWNLOAD
   ===================================================== */

function downloadTableExcel(tableId, fileName) {

    const table = document.getElementById(tableId);

    if (!table) {
        alert("❌ Data table not found.");
        return;
    }

    if (typeof XLSX === "undefined") {
        alert("❌ Excel library is not loaded. Please refresh the page.");
        return;
    }

    try {

        /* =========================================
           CLONE TABLE
        ========================================= */

        const clone = table.cloneNode(true);


        /* =========================================
           CONVERT SELECT / INPUT TO TEXT
        ========================================= */

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


        clone.querySelectorAll("input").forEach(function(input) {

            const cell = input.parentElement;

            if (cell) {
                cell.textContent = input.value || "";
            }

        });


        /* =========================================
           REMOVE BUTTONS / ACTION COLUMNS
        ========================================= */

        clone.querySelectorAll("button").forEach(function(button) {
            button.remove();
        });


        /* =========================================
           READ TABLE INTO ARRAY
           Everything is kept as TEXT
           This prevents:
           - Docket scientific notation
           - Date ####
           ========================================= */

        const data = [];

        clone.querySelectorAll("tr").forEach(function(row) {

            const rowData = [];

            row.querySelectorAll("th, td").forEach(function(cell) {

                let value = (cell.textContent || "")
                    .replace(/\s+/g, " ")
                    .trim();

                rowData.push(value);

            });

            if (rowData.length) {
                data.push(rowData);
            }

        });


        if (!data.length) {
            alert("❌ No data available for Excel export.");
            return;
        }


        /* =========================================
           CREATE REAL XLSX WORKBOOK
        ========================================= */

        const workbook = XLSX.utils.book_new();

        const worksheet = XLSX.utils.aoa_to_sheet(data);


        /* =========================================
           PROFESSIONAL COLUMN WIDTHS
        ========================================= */

        const headers = data[0].map(function(header) {
            return String(header || "")
                .trim()
                .toLowerCase();
        });


        worksheet["!cols"] = headers.map(function(header) {

            if (
                header.includes("entry") ||
                header.includes("date") ||
                header.includes("time")
            ) {
                return { wch: 20 };
            }

            if (
                header.includes("technician") ||
                header.includes("technician name")
            ) {
                return { wch: 24 };
            }

            if (
                header.includes("site")
            ) {
                return { wch: 18 };
            }

            if (
                header.includes("dg make") ||
                header.includes("make")
            ) {
                return { wch: 18 };
            }

            if (
                header.includes("kva")
            ) {
                return { wch: 12 };
            }

            if (
                header.includes("fault")
            ) {
                return { wch: 28 };
            }

            if (
                header.includes("remark")
            ) {
                return { wch: 50 };
            }

            if (
                header.includes("docket")
            ) {
                return { wch: 20 };
            }

            if (
                header.includes("status")
            ) {
                return { wch: 15 };
            }

            return { wch: 18 };

        });


        /* =========================================
           FORCE ALL DOCKET CELLS TO TEXT
           Prevent 2.61E+10 type display
        ========================================= */

        const docketColumnIndex = headers.findIndex(function(header) {
            return header.includes("docket");
        });


        if (docketColumnIndex >= 0) {

            for (let r = 1; r < data.length; r++) {

                const cellAddress =
                    XLSX.utils.encode_cell({
                        r: r,
                        c: docketColumnIndex
                    });

                if (worksheet[cellAddress]) {

                    worksheet[cellAddress].t = "s";

                    worksheet[cellAddress].v =
                        String(data[r][docketColumnIndex] || "");

                }

            }

        }


        /* =========================================
           FORCE DATE / TIME COLUMNS TO TEXT
           Prevent ######## display
        ========================================= */

        headers.forEach(function(header, columnIndex) {

            const isDateColumn =
                header.includes("date") ||
                header.includes("time") ||
                header.includes("entry");

            if (!isDateColumn) {
                return;
            }

            for (let r = 1; r < data.length; r++) {

                const cellAddress =
                    XLSX.utils.encode_cell({
                        r: r,
                        c: columnIndex
                    });

                if (worksheet[cellAddress]) {

                    worksheet[cellAddress].t = "s";

                    worksheet[cellAddress].v =
                        String(data[r][columnIndex] || "");

                }

            }

        });


        /* =========================================
           WRAP LONG TEXT
           Remarks / Fault columns
        ========================================= */

        headers.forEach(function(header, columnIndex) {

            if (
                header.includes("remark") ||
                header.includes("fault")
            ) {

                for (let r = 0; r < data.length; r++) {

                    const cellAddress =
                        XLSX.utils.encode_cell({
                            r: r,
                            c: columnIndex
                        });

                    if (worksheet[cellAddress]) {

                        worksheet[cellAddress].s = {
                            alignment: {
                                wrapText: true,
                                vertical: "top"
                            }
                        };

                    }

                }

            }

        });


        /* =========================================
           AUTO FILTER
        ========================================= */

        worksheet["!autofilter"] = {
            ref: XLSX.utils.encode_range({
                s: { r: 0, c: 0 },
                e: {
                    r: data.length - 1,
                    c: data[0].length - 1
                }
            })
        };


        /* =========================================
           FREEZE HEADER ROW
        ========================================= */

        worksheet["!freeze"] = {
            xSplit: 0,
            ySplit: 1
        };


        /* =========================================
           ADD SHEET
        ========================================= */

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Fault Tracker"
        );


        /* =========================================
           FORCE XLSX EXTENSION
        ========================================= */

        let finalFileName =
            fileName || "DG_Fault_Tracker.xlsx";

        finalFileName =
            finalFileName
                .replace(/\.xls$/i, "")
                .replace(/\.xlsx$/i, "")
                + ".xlsx";


        /* =========================================
           DOWNLOAD REAL XLSX
        ========================================= */

        XLSX.writeFile(
            workbook,
            finalFileName,
            {
                bookType: "xlsx",
                compression: true
            }
        );

    } catch (error) {

        console.error(
            "Excel Export Error:",
            error
        );

        alert(
            "❌ Excel download failed.\n\n" +
            error.message
        );

    }

}
async function deleteTechnicianRow(name) {
  if (!name) {
    alert("Technician name not found.");
    return;
  }

  if (!confirm("Delete technician: " + name + "?")) {
    return;
  }

  try {
    const response = await apiGet("deleteTechnician", {
      name: name
    });

    alert(
      response && response.message
        ? response.message
        : "Request completed."
    );

    await loadTechnicians(true);
  } catch (error) {
    alert(
      "Delete failed: " +
      (error && error.message ? error.message : error)
    );
  }
}


