(function(){
  if (typeof window === 'undefined') return;
  window.NVC = window.NVC || {};
  NVC.Api = NVC.Api || {};

  const cfg = NVC.Config && NVC.Config.GOOGLE_SHEETS_CONFIG;

  // Full-featured JSONP-based GET (moved from script.js)
  NVC.Api.getFromGoogleSheets = async function(action, params = {}) {
    if (!cfg || !cfg.ENABLED) {
      console.log('ℹ️ Google Sheets disabled');
      return { success: false, data: [], message: 'Integration disabled' };
    }
    if (!cfg.API_KEY) return { success: false, data: [], message: 'API Key missing' };
    if (!cfg.WEB_APP_URL || !cfg.WEB_APP_URL.includes('script.google.com/macros/s/')) {
      return { success: false, data: [], message: 'Invalid Web App URL' };
    }

    const url = new URL(cfg.WEB_APP_URL);
    url.searchParams.append('action', action);
    url.searchParams.append('apiKey', cfg.API_KEY);
    Object.keys(params || {}).forEach(key => {
      const v = params[key];
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.append(key, String(v));
      }
    });
    url.searchParams.append('t', Date.now()); // cache buster

    try {
      // Using fetch for GET requests. This avoids JSONP multi-login issues.
      // The Google Apps Script doGet must return a proper JSON response
      // with ContentService.MimeType.JSON for this to work with CORS.
      const response = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        redirect: 'follow' // Google Apps Script often redirects, so follow it.
      });

      if (!response.ok) {
        console.error(`Google Sheets GET failed with status: ${response.status}`);
        return { success: false, data: [], message: `Network error: ${response.statusText}`, action };
      }

      // The Apps Script should return a JSON response.
      const result = await response.json();
      return result;

    } catch (error) {
      console.error('❌ Google Sheets GET Error:', error);
      let message = `Request failed: ${error.message}.`;
      if (error instanceof TypeError) { // Often indicates a CORS or network issue
        message = 'Google Sheets बाट डाटा तान्न सकिएन (CORS or Network Error)। Apps Script Web App deployment (Anyone access) र URL जाँच गर्नुहोस्।';
        try {
          if (typeof NVC.UI !== 'undefined' && typeof NVC.UI.showToast === 'function') {
            NVC.UI.showToast(message, { bg: '#d32f2f', duration: 7000 });
          }
        } catch (e) {}
      }
      return { success: false, data: [], message: message, action };
    }
  };

  // Full-featured JSONP POST (moved from script.js)
  NVC.Api.postToGoogleSheets = async function(action, data = {}) {
    if (!cfg || !cfg.ENABLED) {
      return { success: true, message: 'Data saved locally (Google Sheets disabled)', id: data.id || null, local: true };
    }

    // The payload to be sent.
    const payload = {
        action: action,
        apiKey: cfg.API_KEY,
        ...data
    };

    try {
        // Using fetch with POST and text/plain content type to avoid CORS preflight issues.
        // The Google Apps Script must be set up to handle this by parsing e.postData.contents.
        const response = await fetch(cfg.WEB_APP_URL, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'text/plain;charset=UTF-8',
            },
            body: JSON.stringify(payload),
            redirect: 'follow'
        });

        if (!response.ok) {
            // Handle HTTP errors (e.g., 404, 500)
            console.error(`Google Sheets POST failed with status: ${response.status}`);
            return { success: false, message: `Network error: ${response.statusText}. Saved locally.`, id: data.id, local: true };
        }

        // The Apps Script should return a JSON response with correct CORS headers.
        // If it doesn't, the await response.json() will fail due to CORS policy.
        const result = await response.json();
        return result;

    } catch (error) {
        console.error('❌ Google Sheets POST Error:', error);
        let message = `Request failed: ${error.message}. Saved locally.`;
        if (error instanceof TypeError) { // Often indicates a CORS or network issue
            message = 'Google Sheets मा पठाउन सकिएन (CORS or Network Error)। Apps Script Web App deployment र URL जाँच गर्नुहोस्।';
            try {
                if (typeof NVC.UI !== 'undefined' && typeof NVC.UI.showToast === 'function') {
                    NVC.UI.showToast(message, { bg: '#d32f2f', duration: 7000 });
                }
            } catch (e) {}
        }
        return { success: false, message: message, id: data.id, local: true };
    }
  };

  // loadDataFromGoogleSheets: delegate to NVC.Api.getFromGoogleSheets multiple calls and format
  NVC.Api.loadDataFromGoogleSheets = async function(forceReload = false) {
    if (window._isLoadingData && !forceReload) return window._lastLoadResult || false;
    if (!cfg || !cfg.ENABLED) return false;
    window._isLoadingData = true;
    try {
      const response = await NVC.Api.getFromGoogleSheets('getComplaints');
      if (!response || response.success === false) { window._lastLoadResult = false; return false; }
      const complaintsData = Array.isArray(response.data) ? response.data : [];
      const formattedComplaints = (complaintsData || []).map(item => { try { if (typeof formatComplaintFromSheet === 'function') return formatComplaintFromSheet(item); return item; } catch (e) { return null; } }).filter(Boolean);
      NVC.State.set('complaints', formattedComplaints);

      // Also attempt to load technical projects (प्राविधिक परीक्षण/आयोजना अनुगमन) from Sheets
      try {
        const projRes = await NVC.Api.getFromGoogleSheets('getProjects');
        if (projRes && projRes.success !== false) {
          const projectsData = Array.isArray(projRes.data) ? projRes.data : [];
          const formattedProjects = (projectsData || []).map(item => { try { if (typeof formatProjectFromSheet === 'function') return formatProjectFromSheet(item); return item; } catch (e) { return null; } }).filter(Boolean);
          NVC.State.set('projects', formattedProjects);
        }
      } catch (e) {
        console.warn('Projects load failed', e);
      }

      window._lastLoadResult = true;
      return true;
    } catch (e) { console.error('Sheets load failed', e); window._lastLoadResult = false; return false; }
    finally { window._isLoadingData = false; }
  };

  // Save a complaint (migrated from script.js)
  NVC.Api.saveComplaintToGoogleSheets = async function(complaintData) {
    const stateObj = window.state || (NVC.State && NVC.State.state) || {};
    if (!cfg || !cfg.ENABLED || stateObj.useLocalData) {
      const newComplaint = {
        id: complaintData.id || (typeof generateComplaintId === 'function' ? generateComplaintId() : `local_${Date.now()}`),
        date: complaintData.date || (typeof getCurrentNepaliDate === 'function' ? getCurrentNepaliDate() : ''),
        complainant: complaintData.complainant || '',
        accused: complaintData.accused || '',
        description: complaintData.description || '',
        shakha: complaintData.shakha || stateObj.currentUser?.shakha || '',
        mahashakha: complaintData.mahashakha || '',
        status: complaintData.status || 'pending',
        proposedDecision: complaintData.proposedDecision || '',
        decision: complaintData.decision || '',
        finalDecision: (typeof normalizeFinalDecisionType === 'function') ? normalizeFinalDecisionType(complaintData.finalDecision || '') : (complaintData.finalDecision || ''),
        remarks: complaintData.remarks || '',
        source: complaintData.source || 'internal',
        createdBy: stateObj.currentUser?.name || '',
        createdAt: new Date().toISOString()
      };
      try {
        if (NVC.State && typeof NVC.State.push === 'function') NVC.State.push('complaints', newComplaint);
        else {
          stateObj.complaints = stateObj.complaints || [];
          stateObj.complaints.unshift(newComplaint);
        }
      } catch (e) {}
      return { success: true, message: 'Complaint saved locally', id: newComplaint.id };
    }

    try {
      const payload = {
        id: complaintData.id, date: complaintData.date,
        complainant: complaintData.complainant, accused: complaintData.accused,
        description: complaintData.description,
        shakha: complaintData.shakha || stateObj.currentUser?.shakha,
        mahashakha: complaintData.mahashakha,
        status: complaintData.status || 'pending',
        proposedDecision: complaintData.proposedDecision,
        finalDecision: (typeof normalizeFinalDecisionType === 'function') ? normalizeFinalDecisionType(complaintData.finalDecision || '') : (complaintData.finalDecision || ''),
        remarks: complaintData.remarks,
        source: complaintData.source || 'internal',
        createdBy: stateObj.currentUser?.name
      };
      const result = await NVC.Api.postToGoogleSheets('saveComplaint', payload);

      if (result && result.success) {
        const newComplaint = {
          id: result.id || complaintData.id, date: complaintData.date,
          complainant: complaintData.complainant, accused: complaintData.accused,
          description: complaintData.description,
          shakha: complaintData.shakha || stateObj.currentUser?.shakha,
          mahashakha: complaintData.mahashakha,
          status: complaintData.status || 'pending',
          proposedDecision: complaintData.proposedDecision,
          decision: complaintData.decision,
          finalDecision: (typeof normalizeFinalDecisionType === 'function') ? normalizeFinalDecisionType(complaintData.finalDecision || '') : (complaintData.finalDecision || ''),
          remarks: complaintData.remarks,
          source: complaintData.source || 'internal'
        };
        try {
          if (NVC.State && typeof NVC.State.push === 'function') NVC.State.push('complaints', newComplaint);
          else {
            stateObj.complaints = stateObj.complaints || [];
            stateObj.complaints.unshift(newComplaint);
          }
        } catch(e){}
      }
      return result;
    } catch (error) {
      console.error('Error saving complaint:', error);
      return NVC.Api.saveComplaintToGoogleSheets({ ...complaintData, useLocal: true });
    }
  };

  NVC.Api.updateComplaintInGoogleSheets = async function(complaintId, updateData) {
    const stateObj = window.state || (NVC.State && NVC.State.state) || {};
    if (!cfg || !cfg.ENABLED || stateObj.useLocalData) {
      const index = (stateObj.complaints || []).findIndex(c => c.id === complaintId);
      if (index !== -1) {
        try {
          if (NVC.State && typeof NVC.State.set === 'function') {
            const arr = stateObj.complaints.slice(); arr[index] = { ...arr[index], ...updateData }; NVC.State.set('complaints', arr);
          } else {
            stateObj.complaints[index] = { ...stateObj.complaints[index], ...updateData };
          }
        } catch(e){}
        return { success: true, message: 'Complaint updated locally' };
      }
      return { success: false, message: 'Complaint not found' };
    }

    try {
      const payload = {
        id: complaintId, status: updateData.status,
        finalDecision: (typeof normalizeFinalDecisionType === 'function') ? normalizeFinalDecisionType(updateData.finalDecision || '') : (updateData.finalDecision || ''),
        remarks: updateData.remarks,
        updatedBy: stateObj.currentUser?.name
      };
      const result = await NVC.Api.postToGoogleSheets('updateComplaint', payload);
      if (result && result.success) {
        const index = (stateObj.complaints || []).findIndex(c => c.id === complaintId);
        if (index !== -1) {
          try {
            if (NVC.State && typeof NVC.State.set === 'function') {
              const arr = stateObj.complaints.slice(); arr[index] = { ...arr[index], ...updateData }; NVC.State.set('complaints', arr);
            } else {
              stateObj.complaints[index] = { ...stateObj.complaints[index], ...updateData };
            }
          } catch(e){}
        }
      }
      return result;
    } catch (error) {
      console.error('updateComplaintInGoogleSheets failed', error);
      return { success: false, message: String(error) };
    }
  };

})();
