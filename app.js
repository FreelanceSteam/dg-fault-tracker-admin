/* =====================================================
   DG FAULT TRACKER - GITHUB ADMIN APP
   Apps Script API Connection
   ===================================================== */

const API_URL =
  "https://script.google.com/macros/s/AKfycbzY8la37LIrnj4T6Uy4lUL5DY21NzpLnaNfbg3TZST7KpaYTesaQ3qFbCqk8QsQSZT0PA/exec";


/* =====================================================
   JSONP API CALL
   GitHub -> Apps Script
   ===================================================== */

function apiGet(action, params = {}) {

  return new Promise(function(resolve, reject) {

    const callbackName =
      "dgApi_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 10000);

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
          params[key]
        );
      }

    });

    const timeout =
      setTimeout(function() {

        cleanup();

        reject(
          new Error(
            "API request timed out."
          )
        );

      }, 20000);


    function cleanup() {

      clearTimeout(timeout);

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

      try {
        delete window[callbackName];
      } catch (e) {
        window[callbackName] = undefined;
      }

    }


    window[callbackName] =
      function(response) {

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


  const section =
    document.getElementById(tabId);

  if (section) {
    section.classList.add("active");
  }


  if (button) {
    button.classList.add("active");
  }


  if (tabId === "dashboard") {
    loadDashboard();
  }


  if (tabId === "faults") {
    loadFaults();
  }


  if (tabId === "sites") {
    loadSites();
  }


  if (tabId === "technicians") {
    loadTechnicians();
  }

}


/* =====================================================
   DASHBOARD
   ===================================================== */

async function loadDashboard() {

  const loading =
    document.getElementById(
      "dashboardLoading"
    );

  const content =
    document.getElementById(
      "dashboardContent"
    );


  if (loading) {

    loading.style.display = "block";

    loading.textContent =
      "Loading dashboard...";

  }


  if (content) {
    content.style.display = "none";
  }


  try {

    const data =
      await apiGet("dashboard");


    const total =
      Number(
        data &&
        data.totalFaults || 0
      );

    const open =
      Number(
        data &&
        data.open || 0
      );

    const inProgress =
      Number(
        data &&
        data.inProgress || 0
      );

    const closed =
      Number(
        data &&
        data.closed || 0
      );

    const material =
      Number(
        data &&
        data.waitingMaterial || 0
      );

    const vendor =
      Number(
        data &&
        data.waitingVendor || 0
      );

    const sites =
      Number(
        data &&
        data.totalSites || 0
      );

    const technicians =
      Number(
        data &&
        data.totalTechnicians || 0
      );


    setText(
      "totalFaults",
      total
    );

    setText(
      "openFaults",
      open
    );

    setText(
      "progressFaults",
      inProgress
    );

    setText(
      "closedFaults",
      closed
    );

    setText(
      "materialFaults",
      material
    );

    setText(
      "vendorFaults",
      vendor
    );

    setText(
      "totalSites",
      sites
    );

    setText(
      "totalTechnicians",
      technicians
    );


    setText(
      "activeFaults",
      open + inProgress
    );


    const closureRate =
      total > 0
        ? Math.round(
            (closed * 100) /
            total
          ) + "%"
        : "0%";


    setText(
      "closureRate",
      closureRate
    );


    setText(
      "lastRefresh",
      new Date().toLocaleString()
    );


    if (loading) {
      loading.style.display = "none";
    }


    if (content) {
      content.style.display = "block";
    }


  } catch (error) {

    console.error(
      "Dashboard API Error:",
      error
    );


    if (loading) {

      loading.style.display = "block";

      loading.textContent =
        "Dashboard Error: " +
        (
          error.message ||
          error
        );

    }

  }

}


/* =====================================================
   FAULT TRACKER
   ===================================================== */

let faultData = [];


async function loadFaults() {

  const loading =
    document.getElementById(
      "faultLoading"
    );


  if (loading) {

    loading.style.display = "block";

    loading.textContent =
      "Loading fault records...";

  }


  try {

    const result =
      await apiGet("faults");


    faultData =
      normalizeRows(result);


    renderTable(
      faultData,
      "faultHead",
      "faultBody"
    );


    if (loading) {
      loading.style.display = "none";
    }


  } catch (error) {

    console.error(
      "Fault API Error:",
      error
    );


    if (loading) {

      loading.style.display = "block";

      loading.textContent =
        "Fault Tracker Error: " +
        (
          error.message ||
          error
        );

    }

  }

}


function filterFaults() {

  const value =
    (
      document.getElementById(
        "faultSearch"
      ) || {}
    ).value || "";


  const filtered =
    filterRows(
      faultData,
      value
    );


  renderTable(
    filtered,
    "faultHead",
    "faultBody"
  );

}


/* =====================================================
   SITE MASTER
   ===================================================== */

let siteData = [];


async function loadSites() {

  const loading =
    document.getElementById(
      "siteLoading"
    );


  if (loading) {

    loading.style.display = "block";

    loading.textContent =
      "Loading site master...";

  }


  try {

    const result =
      await apiGet("sites");


    siteData =
      normalizeRows(result);


    renderTable(
      siteData,
      "siteHead",
      "siteBody"
    );


    if (loading) {
      loading.style.display = "none";
    }


  } catch (error) {

    console.error(
      "Site API Error:",
      error
    );


    if (loading) {

      loading.style.display = "block";

      loading.textContent =
        "Site Master Error: " +
        (
          error.message ||
          error
        );

    }

  }

}


function filterSites() {

  const value =
    (
      document.getElementById(
        "siteSearch"
      ) || {}
    ).value || "";


  const filtered =
    filterRows(
      siteData,
      value
    );


  renderTable(
    filtered,
    "siteHead",
    "siteBody"
  );

}


/* =====================================================
   TECHNICIAN LINKS
   ===================================================== */

let technicianData = [];


async function loadTechnicians() {

  const loading =
    document.getElementById(
      "techLoading"
    );


  if (loading) {

    loading.style.display = "block";

    loading.textContent =
      "Loading technician links...";

  }


  try {

    const result =
      await apiGet("technicians");


    technicianData =
      normalizeRows(result);


    renderTable(
      technicianData,
      "techHead",
      "techBody"
    );


    if (loading) {
      loading.style.display = "none";
    }


  } catch (error) {

    console.error(
      "Technician API Error:",
      error
    );


    if (loading) {

      loading.style.display = "block";

      loading.textContent =
        "Technician Links Error: " +
        (
          error.message ||
          error
        );

    }

  }

}


function filterTechnicians() {

  const value =
    (
      document.getElementById(
        "techSearch"
      ) || {}
    ).value || "";


  const filtered =
    filterRows(
      technicianData,
      value
    );


  renderTable(
    filtered,
    "techHead",
    "techBody"
  );

}


/* =====================================================
   TABLE HELPERS
   ===================================================== */

function normalizeRows(data) {

  if (!data) {
    return [];
  }


  if (Array.isArray(data)) {
    return data;
  }


  if (Array.isArray(data.rows)) {
    return data.rows;
  }


  if (Array.isArray(data.data)) {
    return data.data;
  }


  if (typeof data === "object") {

    return Object.keys(data)
      .map(function(key) {

        return {
          Key: key,
          Value: data[key]
        };

      });

  }


  return [];

}


function renderTable(
  rows,
  headId,
  bodyId
) {

  const head =
    document.getElementById(headId);

  const body =
    document.getElementById(bodyId);


  if (!head || !body) {
    return;
  }


  head.innerHTML = "";
  body.innerHTML = "";


  if (!rows || rows.length === 0) {

    body.innerHTML =
      '<tr><td colspan="20">' +
      "No data found" +
      "</td></tr>";

    return;

  }


  let headers = [];


  if (
    Array.isArray(rows[0])
  ) {

    headers =
      rows[0].map(
        function(_, index) {
          return "Column " +
            (index + 1);
        }
      );

  } else {

    headers =
      Object.keys(rows[0]);

  }


  const headerRow =
    document.createElement("tr");


  headers.forEach(
    function(header) {

      const th =
        document.createElement("th");

      th.textContent =
        header;

      headerRow.appendChild(th);

    }
  );


  head.appendChild(headerRow);


  rows.forEach(
    function(row) {

      const tr =
        document.createElement("tr");


      headers.forEach(
        function(header, index) {

          const td =
            document.createElement("td");


          let value;


          if (Array.isArray(row)) {
            value = row[index];
          } else {
            value = row[header];
          }


          if (
            value === null ||
            value === undefined
          ) {
            value = "";
          }


          td.textContent =
            String(value);


          tr.appendChild(td);

        }
      );


      body.appendChild(tr);

    }
  );

}


function filterRows(
  rows,
  search
) {

  if (!search) {
    return rows;
  }


  const text =
    String(search)
      .toLowerCase()
      .trim();


  if (!text) {
    return rows;
  }


  return rows.filter(
    function(row) {

      return JSON.stringify(row)
        .toLowerCase()
        .includes(text);

    }
  );

}


/* =====================================================
   TEXT HELPER
   ===================================================== */

function setText(
  id,
  value
) {

  const element =
    document.getElementById(id);


  if (element) {
    element.textContent =
      value === undefined ||
      value === null ||
      value === ""
        ? "0"
        : value;
  }

}


/* =====================================================
   INITIAL LOAD
   ===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    loadDashboard();

  }
);
