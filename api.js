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
    if (!cfg.WEB_APP_URL || cfg.WEB_APP_URL.includes('script.google.com/macros/s/') === false) {
      return { success: false, data: [], message: 'Invalid Web App URL' };
    }

    return new Promise((resolve) => {
      try {
        let url = cfg.WEB_APP_URL;
        url += `?action=${encodeURIComponent(action)}`;
        url += `&apiKey=${encodeURIComponent(cfg.API_KEY)}`;
        Object.keys(params || {}).forEach(key => {
          const v = params[key];
          if (v !== undefined && v !== null && v !== '') url += `&${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`;
        });
        const callbackName = `jsonp_${action}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
        url += `&callback=${callbackName}`;
        url += `&t=${Date.now()}`;

        let isResolved = false;
        let retryCount = 0;

        const timeout = setTimeout(() => {
          if (!isResolved) {
            cleanup();
            if (retryCount < (cfg.MAX_RETRIES || 3)) {
              retryCount++;
              setTimeout(() => {
                const newCallback = `${callbackName}_retry${retryCount}`;
                url = url.replace(/&callback=[^&]+/, `&callback=${newCallback}`);
                url = url.replace(/&t=\d+/, `&t=${Date.now()}`);
                window[newCallback] = window[callbackName];
                script.src = url;
                document.head.appendChild(script);
              }, (cfg.RETRY_DELAY || 1000) * retryCount);
            } else {
              resolve({ success: false, data: [], message: 'Timeout after retries', action });
            }
          }
        }, cfg.TIMEOUT || 30000);

        const cleanup = () => {
          clearTimeout(timeout);
          try { if (window[callbackName]) delete window[callbackName]; } catch (e) {}
          try { if (script && script.parentNode) script.parentNode.removeChild(script); } catch (e) {}
        };

        window[callbackName] = function(response) {
          if (isResolved) return;
          isResolved = true; cleanup();
          let formatted = response || { success: false, data: [] };
          if (Array.isArray(formatted)) formatted = { success: true, data: formatted, count: formatted.length };
          else if (formatted.data && Array.isArray(formatted.data) && formatted.success === undefined) formatted.success = true;
          else if (formatted.success === undefined) formatted.success = !!formatted.data || !!formatted.id;
          resolve(formatted);
        };

        const script = document.createElement('script');
        script.src = url; script.async = true;
        script.onerror = function(error) {
          if (isResolved) return;
          if (retryCount < (cfg.MAX_RETRIES || 3)) {
            retryCount++;
            setTimeout(() => {
              try { url = url.replace(/&t=\d+/, `&t=${Date.now()}`); } catch (e) {}
              const newScript = document.createElement('script'); newScript.src = url; newScript.async = true; newScript.onerror = script.onerror; document.head.appendChild(newScript);
            }, (cfg.RETRY_DELAY || 1000) * retryCount);
          } else {
            cleanup();
            try { if (typeof NVC.UI !== 'undefined' && typeof NVC.UI.showToast === 'function') NVC.UI.showToast('❌ Google Sheets connect हुन सकेन। Apps Script Web App deployment (Anyone access) र URL जाँच गर्नुहोस्।', {bg:'#d32f2f'}); } catch (e) {}
            console.error('❌ Google Sheets Script Load Error: Possible CORS or Permissions issue. Ensure "Who has access" is set to "Anyone". URL:', url);
            resolve({ success: false, data: [], message: 'Network error after retries', action });
          }
        };

        document.head.appendChild(script);
      } catch (error) {
        resolve({ success: false, data: [], message: String(error), action });
      }
    });
  };

  // Full-featured JSONP POST (moved from script.js)
  NVC.Api.postToGoogleSheets = async function(action, data = {}) {
    if (!cfg || !cfg.ENABLED) {
      return { success: true, message: 'Data saved locally (Google Sheets disabled)', id: data.id || null, local: true };
    }
    return new Promise((resolve) => {
      try {
        let url = cfg.WEB_APP_URL;
        url += `?action=${encodeURIComponent(action)}`;
        url += `&apiKey=${encodeURIComponent(cfg.API_KEY)}`;
        url += `&t=${Date.now()}`; // Add timestamp to prevent caching

        const enhanced = { ...data };
        try { Object.keys(data || {}).forEach(k => { const v = data[k]; if (v === undefined || v === null) return; const keyStr = String(k); const dateRegex = /date|मिति|दर्ता/i; if (dateRegex.test(keyStr)) { try { if (typeof NVC.Utils !== 'undefined' && typeof NVC.Utils.latinToDevanagari === 'function') enhanced[k] = NVC.Utils.latinToDevanagari(String(v)); else enhanced[k] = String(v); enhanced[`${k}Iso`] = String(v); } catch (e) {} } }); } catch (e) {}

        Object.keys(enhanced).forEach(key => { const value = enhanced[key]; if (value !== undefined && value !== null) { url += `&${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`; } });
        const callbackName = `post_${action}_${Date.now()}`;
        url += `&callback=${callbackName}`;

        let isResolved = false; let didTimeout = false; let lateHandled = false;
        const timeout = setTimeout(() => {
          if (!isResolved) { didTimeout = true; isResolved = true; resolve({ success: false, message: 'Request timed out. Saved locally for later sync.', id: data.id, local: true, timeout: true }); }
        }, cfg.TIMEOUT || 60000);

        window[callbackName] = function(response) {
          if (lateHandled) return;
          if (didTimeout) { lateHandled = true; try { const isSuccess = response && (response.success === true || response.success === 'true'); if (isSuccess) { try { if (typeof NVC.UI !== 'undefined' && typeof NVC.UI.showToast === 'function') NVC.UI.showToast('✅ उजुरी Google Sheet मा सेभ भयो (ढिलो प्रतिक्रिया)', {bg:'#2e7d32'}); } catch (e) {} } } catch (e) {} finally { try { delete window[callbackName]; } catch(e){}; try { if (script && script.parentNode) script.parentNode.removeChild(script); } catch (e) {} } return; }
          if (isResolved) return; isResolved = true; clearTimeout(timeout); try { delete window[callbackName]; } catch (e) {};
          try { if (script && script.parentNode) script.parentNode.removeChild(script); } catch (e) {}
          let formatted = response || { success: false, message: 'No response from server', id: data.id, local: true };
          if (typeof formatted === 'string') { try { formatted = JSON.parse(formatted); } catch (e) { formatted = { success: false, message: formatted, id: data.id, local: true }; } }
          if (formatted.success === undefined) formatted.success = false;
          resolve(formatted);
        };

        const script = document.createElement('script'); script.src = url; script.async = true;
        script.onerror = function(error) {
          if (isResolved) return;
          (async () => {
            try {
              clearTimeout(timeout);
              const bodyParams = new URLSearchParams(); bodyParams.append('action', action); bodyParams.append('apiKey', cfg.API_KEY);
              Object.keys(enhanced || data).forEach(k => { const v = (enhanced && enhanced[k] !== undefined) ? enhanced[k] : data[k]; if (v !== undefined && v !== null) bodyParams.append(k, String(v)); });
              const resp = await fetch(cfg.WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: bodyParams.toString(), credentials: 'omit' });
              let json = null; try { json = await resp.json(); } catch (e) { json = null; }
              if (json && (json.success === true || json.success === 'true')) { isResolved = true; try { delete window[callbackName]; } catch (e) {} try { if (script && script.parentNode) script.parentNode.removeChild(script); } catch (e) {} resolve(json); return; }
            } catch (fetchError) {
              console.error('❌ Google Sheets Fallback Fetch Error:', fetchError);
            }
            if (isResolved) return; isResolved = true; clearTimeout(timeout); try { delete window[callbackName]; } catch (e) {} try { if (script && script.parentNode) script.parentNode.removeChild(script); } catch (e) {} resolve({ success: false, message: 'Network error - saved locally', id: data.id, local: true, error: String(error) });
          })();
        };

        document.head.appendChild(script);
      } catch (error) {
        resolve({ success: false, message: String(error), id: data.id, local: true });
      }
    });
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
