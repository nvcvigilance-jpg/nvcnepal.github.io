
    // ==================== GOOGLE SHEETS CONFIGURATION ====================
const GOOGLE_SHEETS_CONFIG = {
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzCto7O7ffF-D-nHi_h3NNjEAjYPTn9TO1ruJjNZZNZdch_Aq0BLQpgAM-wYP_P9VYQ8g/exec',
  API_KEY: 'nvc2026secretkey',
  ENABLED: true,
  USE_CORS_PROXY: false,

  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  TIMEOUT: 30000
};

// UI theme (light/dark) default
var currentTheme = 'light';

// ==================== AI SYSTEM CONFIGURATION ====================
const AI_SYSTEM = {
  keywords: {
    high: ['तुरुन्त', 'अति', 'गम्भीर', 'भ्रष्टाचार', 'घूस', 'ज्यान', 'जोखिम', 'urgent', 'corruption', 'करोड'],
    medium: ['समस्या', 'ढिला', 'अनियमितता', 'गुनासो', 'delay', 'लापरवाही'],
    // New Classification Keywords
    corruption: ['भ्रष्टाचार', 'घूस', 'रकम', 'लेनदेन', 'घुस', 'corruption', 'bribe', 'commission', 'कमिशन'],
    procurement: ['ठेक्का', 'खरिद', 'टेन्डर', 'बोलपत्र', 'procurement', 'contract', 'tender', 'bidding'],
    financial: ['हिनामिना', 'अनियमितता', 'बजेट', 'दुरुपयोग', 'नक्कली बिल', 'embezzlement', 'financial', 'audit', 'बेरुजु', 'आर्थिक'],
    infrastructure: ['बाटो', 'पुल', 'भवन', 'निर्माण', 'गुणस्तर', 'इन्जिनियर', 'सिमेन्ट', 'डण्डी', 'infrastructure', 'construction', 'road'],
    service: ['सेवा', 'ढिलासुस्ती', 'सास्ती', 'काम भएन', 'service', 'delay', 'hassle', 'नागरिक बडापत्र'],
    conduct: ['आचरण', 'व्यवहार', 'गालीगलौज', 'मादक', 'पदार्थ', 'conduct', 'behavior', 'staff', 'कर्मचारी', 'हाजिरी', 'बिदा'],
    policy: ['निर्णय', 'प्रक्रिया', 'विधि', 'नियुक्ति', 'नियुक्त', 'नियम', 'विपरीत', 'मापदण्ड', 'policy', 'decision', 'rule', 'law', 'ऐन', 'नियम'],
    // Old Keywords (kept for backward compatibility)
    technical: ['बाटो', 'पुल', 'भवन', 'निर्माण', 'गुणस्तर', 'इन्जिनियर', 'ठेक्का', 'construction', 'road', 'सिमेन्ट', 'डण्डी'],
    admin: ['कर्मचारी', 'हाजिरी', 'बिदा', 'सरुवा', 'बढुवा', 'प्रशासन', 'staff', 'leave', 'पोशाक'],
    police: ['प्रहरी', 'सुरक्षा', 'अपराध', 'police', 'security', 'चोरी']
  },

  analyzeComplaint: function(description) {
    if (!description) return { priority: 'साधारण', category: 'अन्य', classification: 'अन्य', summary: '', sentiment: 'तटस्थ', entities: [] };
    
    let priority = 'साधारण';
    let category = 'अन्य';
    let classification = 'अन्य';
    let score = 0;
    const text = description.toLowerCase();
    
    // 1. Priority Scoring System
    // High impact keywords (Weight: 3)
    this.keywords.high.forEach(k => { if (text.includes(k)) score += 3; });
    // Medium impact keywords (Weight: 1)
    this.keywords.medium.forEach(k => { if (text.includes(k)) score += 1; });

    // 2. Entity Extraction (Money/Amounts)
    const entities = [];
    // Regex for Nepali/English money formats (e.g., 10 लाख, ५० हजार, Rs 5000)
    const moneyRegex = /([०-९\d]+(\.[०-९\d]+)?)\s*(लाख|करोड|हजार|सय|रुपैयाँ|रु|rs|npr|lakh|crore|thousand)/gi;
    const moneyMatches = text.match(moneyRegex);
    if (moneyMatches) {
        moneyMatches.forEach(m => entities.push(m));
        // If large amounts detected, increase score
        if (text.includes('लाख') || text.includes('करोड') || text.includes('lakh') || text.includes('crore')) {
            score += 2;
        }
    }

    // Determine Priority based on Score
    if (score >= 3) priority = 'उच्च';
    else if (score >= 1) priority = 'मध्यम';

    // 3. Classification Detection (Priority Order)
    if (this.keywords.corruption.some(k => text.includes(k))) classification = 'भ्रष्टाचार';
    else if (this.keywords.procurement.some(k => text.includes(k))) classification = 'सार्वजनिक खरिद/ठेक्का';
    else if (this.keywords.financial.some(k => text.includes(k))) classification = 'आर्थिक हिनामिना';
    else if (this.keywords.infrastructure.some(k => text.includes(k))) classification = 'पूर्वाधार निर्माण';
    else if (this.keywords.service.some(k => text.includes(k))) classification = 'सेवा प्रवाह';
    else if (this.keywords.conduct.some(k => text.includes(k))) classification = 'कर्मचारी आचरण';
    else if (this.keywords.policy.some(k => text.includes(k))) classification = 'नीति/निर्णय प्रक्रिया';

    // 4. Category Detection (Department mapping)
    if (this.keywords.technical.some(k => text.includes(k))) category = 'प्राविधिक';
    else if (this.keywords.admin.some(k => text.includes(k))) category = 'प्रशासन';
    else if (this.keywords.police.some(k => text.includes(k))) category = 'प्रहरी';

    // 5. Sentiment Analysis
    let sentiment = 'तटस्थ';
    const negativeKeywords = ['दुःख', 'सास्ती', 'हैरान', 'रिस', 'खराब', 'ढिला', 'समस्या', 'bad', 'worst', 'problem', 'trouble', 'suffering'];
    const urgentKeywords = ['तुरुन्त', 'अति', 'urgent', 'emergency', 'immediately'];
    
    if (urgentKeywords.some(k => text.includes(k))) sentiment = 'अत्यावश्यक (Urgent)';
    else if (negativeKeywords.some(k => text.includes(k))) sentiment = 'नकारात्मक (Negative)';

    // 6. Summary Generation
    const cleanText = description.replace(/\s+/g, ' ').trim();
    // Split by common sentence terminators (Nepali & English)
    const sentences = cleanText.split(/[।?!.]/);
    let summary = sentences[0].trim();
    if (summary.length > 80) summary = summary.substring(0, 77) + '...';
    else if (sentences.length > 1 && sentences[1].trim()) summary += '...';

    return { priority, category, classification, summary, sentiment, entities, score };
  },

  getChatResponse: function(input) {
    input = input.toLowerCase();
    const complaints = state.complaints || [];
    const projects = state.projects || [];
    const now = Date.now();

    // १. सन्दर्भ व्यवस्थापन: पुरानो सन्दर्भ हटाउने (e.g., २ मिनेट भन्दा पुरानो)
    if (state.chatContext && (now - state.chatContext.timestamp > 120000)) {
        console.log('Chat context expired.');
        state.chatContext = null;
    }

    // २. सन्दर्भ अनुसारको प्रश्न (Follow-up Questions)
    if (state.chatContext) {
        const followUpKeywords = ['tell me more', 'details', 'more', 'विवरण', 'थप', 'अझै', 'tell me about it', 'what about it', 'and', 'ani', 'अनि'];
        const isFollowUp = followUpKeywords.some(k => input.includes(k));

        if (isFollowUp && state.chatContext.topic === 'complaint_status' && state.chatContext.lastComplaintId) {
            const complaint = complaints.find(c => String(c.id) === String(state.chatContext.lastComplaintId));
            if (complaint) {
                const fullDetails = `
                    <strong>विस्तृत विवरण (उजुरी नं: ${complaint.id}):</strong><br>
                    <strong>उजुरकर्ता:</strong> ${complaint.complainant}<br>
                    <strong>विवरण:</strong> ${complaint.description || '-'}<br>
                    <strong>कैफियत:</strong> ${complaint.remarks || '-'}<br>
                `;
                state.chatContext = null; // विवरण दिएपछि सन्दर्भ रिसेट गर्ने
                return fullDetails;
            }
        }
    }
    
    // 0. Empty check
    if (!input.trim()) return 'कृपया केही लेख्नुहोस्।';

    // 1. अभिवादन (Greetings)
    if (input.match(/(नमस्ते|hello|hi|namaste|नमस्कार|ओइ|oi|hey|good morning|good afternoon|good evening|subha|morning|evening)/)) {
        const time = new Date().getHours();
        let greeting = 'नमस्ते';
        if (time < 12) greeting = 'शुभ प्रभात';
        else if (time < 18) greeting = 'शुभ दिन';
        else greeting = 'शुभ सन्ध्या';
        
        return `${greeting}! म राष्ट्रिय सतर्कता केन्द्रको AI सहायक हुँ।<br>तपाईं उजुरी, आयोजना, वा कार्यालय अनुगमनको बारेमा सोध्न सक्नुहुन्छ।`;
    }
    
    // 2. परिचय / System Info
    if (input.match(/(who are you|timi ko ho|parichaya|system|about|के हो|यो के हो|परिचय)/)) {
        return 'यो राष्ट्रिय सतर्कता केन्द्रको <strong>उजुरी व्यवस्थापन प्रणाली</strong> हो।<br>यहाँ उजुरी दर्ता, अनुगमन, र कारबाहीको अवस्था हेर्न सकिन्छ।';
    }
    
    // 3. सहयोग (Help)
    if (input.match(/(help|सहयोग|ke garna|what can|menu|options|list|k garna|sakchau|madat)/)) {
        return `
        <strong>म निम्न कुरामा सहयोग गर्न सक्छु:</strong><br>
        - 📊 <em>तथ्याङ्क:</em> "कुल उजुरी", "फछ्रयौट संख्या"<br>
        - 🔍 <em>खोज:</em> "उजुरी नं [ID] को अवस्था"<br>
        - 📝 <em>प्रक्रिया:</em> "उजुरी स्थिति?"<br>
        - 🏗️ <em>आयोजना:</em> "प्राविधिक परीक्षण", "आयोजना स्थिति"<br>
        - 👮 <em>अनुगमन:</em> "कार्यालय अनुगमन", "पोशाक अनुगमन"<br>
        - 📞 <em>सम्पर्क:</em> "सम्पर्क विवरण", "ठेगाना"
        `;
    }

    // 4. तथ्याङ्क (Stats)
    // Pending
    if (input.match(/(कति|how many|count|kati)/) && input.match(/(बाँकी|pending|remaining|banki)/)) {
      const pending = complaints.filter(c => c.status === 'pending').length;
      return `हाल प्रणालीमा <strong>${pending}</strong> वटा उजुरी फछ्रयौट हुन बाँकी छन्।`;
    }
    
    // Resolved
    if (input.match(/(फछ्रयौट|resolved|सकिएको|completed|done|farchyout|sakiyo)/)) {
        const resolved = complaints.filter(c => c.status === 'resolved').length;
        return `हालसम्म <strong>${resolved}</strong> वटा उजुरी फछ्रयौट भइसकेका छन्।`;
    }

    // Progress
    if (input.match(/(चालु|progress|running|process|chalu)/)) {
        const progress = complaints.filter(c => c.status === 'progress').length;
        return `हाल <strong>${progress}</strong> वटा उजुरी कारबाहीको प्रक्रियामा (चालु) छन्।`;
    }

    // Total
    if (input.match(/(कुल|total|जम्मा|all|sum)/) && (input.match(/(उजुरी|complaint|case)/) || !input.match(/(project|ayojana|anugaman)/))) {
      return `प्रणालीमा जम्मा <strong>${complaints.length}</strong> वटा उजुरी दर्ता भएका छन्।`;
    }

    // 5. तथ्याङ्क - आयोजना / प्राविधिक (Projects Stats)
    if (input.match(/(project|ayojana|nirman|technical|prabidhik|आयोजना|निर्माण|प्राविधिक)/)) {
        const total = projects.length;
        const active = projects.filter(p => p.status === 'active').length;
        return `प्राविधिक परीक्षण महाशाखा अन्तर्गत <strong>${total}</strong> वटा आयोजना अनुगमन प्राविधिक/परीक्षण दर्ता छन्।<br>जसमध्ये <strong>${active}</strong> वटा चालु (Active) छन्।`;
    }
    
    // 6. तथ्याङ्क - कर्मचारी अनुगमन (Employee Monitoring)
    if (input.match(/(employee|staff|karmachari|anugaman|monitoring|poshak|time|कर्मचारी|अनुगमन|पोशाक|समय)/)) {
        const total = (state.employeeMonitoring || []).length;
        return `हालसम्म <strong>${total}</strong> पटक कार्यालय अनुगमन भएको छ।<br>विस्तृत विवरणको लागि 'कार्यालय अनुगमन' मेनु हेर्नुहोस्।`;
    }

    // 7. रिपोर्ट (Report)
    if (input.match(/(रिपोर्ट|report|vivaran|details|analytics|graph|chart)/)) {
      return 'तपाईं बायाँ तर्फको मेनुबाट <strong>"रिपोर्टहरू"</strong> मा क्लिक गरी विस्तृत विवरण, ग्राफ र चार्टहरू हेर्न सक्नुहुन्छ।';
    }
    
    // 8. सम्पर्क (Contact)
    if (input.match(/(सम्पर्क|contact|phone|email|location|ठेगाना|address|office|kaha|where|number|mobile)/)) {
        return `
        <strong>राष्ट्रिय सतर्कता केन्द्र</strong><br>
        📍 सिंहदरबार, काठमाडौँ<br>
        📞 फोन: ०१-४२००३५०<br>
        📧 ईमेल: info@nvc.gov.np<br>
        🌐 वेबसाइट: www.nvc.gov.np
        `;
    }

    // 9. उजुरी प्रक्रिया (Complaint Process)
    if (input.match(/(कसरी|how to|register|darta|file|process|tarika|way)/) && input.match(/(उजुरी|complaint|ujuri)/)) {
        return `
        <strong>नयाँ उजुरी दर्ता प्रक्रिया:</strong><br>
        १. लग-इन गर्नुहोस्।<br>
        २. बायाँ मेनुबाट "नयाँ उजुरी" छान्नुहोस्।<br>
        ३. फारममा विवरण भरी "सुरक्षित गर्नुहोस्" थिच्नुहोस्।<br>
        <em>वा हेलो सरकारबाट आएका उजुरीहरू सिधै प्रणालीमा तान्न सकिन्छ।</em>
        `;
    }

    // 10. लगइन / लगआउट (Login/Logout)
    if (input.match(/(login|logout|signin|signout|log in|log out|लगइन|लगआउट)/)) {
        if (state.currentUser) {
            return `तपाईं हाल <strong>${state.currentUser.name}</strong> को रूपमा लग-इन हुनुहुन्छ। लग-आउट गर्न साइडबारको तल रहेको बटन थिच्नुहोस्।`;
        }
        return 'तपाईं लग-इन हुनुहुन्न। कृपया माथि दायाँ कुनामा रहेको "एडमिन प्यानल" वा "उजुरी व्यवस्थापन" मा क्लिक गर्नुहोस्।';
    }

    // 11. धन्यवाद/बिदाई (Thanks/Bye)
    if (input.match(/(धन्यवाद|thank|dhanyabad|bye|tata|goodbye|thx)/)) {
        return 'धन्यवाद! तपाईंको दिन शुभ रहोस्। केही परेमा फेरि सम्झनुहोला। 🙏';
    }

    // 12. उजुरीको अवस्था (Complaint Status by ID)
    const idMatch = input.match(/nvc[-\s]?\d{4}[-\s]?\d{4}/i) || input.match(/nvc[-\s]?\d+/i) || input.match(/\d{4,}/);
    if (idMatch) {
        let searchId = idMatch[0].toUpperCase().replace(/\s/g, '-');
        // If just numbers, try to match loosely
        if (!searchId.includes('NVC')) {
             searchId = idMatch[0];
        }

        const complaint = complaints.find(c => 
            String(c.id).toUpperCase().includes(searchId) || 
            String(c.complaintId || '').toUpperCase().includes(searchId) ||
            (input.match(/\d{4}/) && String(c.id).includes(input.match(/\d{4}/)[0]))
        );
        
        if (complaint) {
            let statusText = 'थाहा छैन';
            let statusIcon = '❓';
            if (complaint.status === 'resolved') { statusText = 'फछ्रयौट भइसकेको'; statusIcon = '✅'; }
            else if (complaint.status === 'progress') { statusText = 'कार्यान्वयनको चरणमा (चालु)'; statusIcon = '⏳'; }
            else { statusText = 'हेर्न बाँकी (Pending)'; statusIcon = '🕒'; }
            
            // SET CONTEXT for follow-up questions
            state.chatContext = {
                topic: 'complaint_status',
                lastComplaintId: complaint.id,
                timestamp: now
            };

            return `
            <strong>उजुरी विवरण फेला पर्यो:</strong><br>
            🆔 नं: ${complaint.id}<br>
            📅 मिति: ${complaint.date}<br>
            👤 उजुरकर्ता: ${complaint.complainant}<br>
            ${statusIcon} अवस्था: ${statusText}<br>
            📝 विषय: ${complaint.description ? complaint.description.substring(0, 40) + '...' : '-'}
            <br><button class="btn btn-sm btn-outline-primary mt-1" onclick="viewComplaint('${complaint.id}')">विवरण हेर्नुहोस्</button>
            `;
        } else {
             if (searchId.includes('NVC') || searchId.length >= 4) {
                return `माफ गर्नुहोला, उजुरी नं <strong>${searchId}</strong> फेला परेन। कृपया नम्बर जाँच गर्नुहोस्।`;
             }
        }
    }

    // 13. Keyword Search (Content Search) - Data Driven
    if (input.match(/(search|khoj|find|खोज|हेर्नु|about|regarding|विषय|बारेमा)/)) {
        const stopWords = ['search', 'khoj', 'find', 'खोज', 'हेर्नु', 'about', 'regarding', 'विषय', 'complaint', 'ujuri', 'ko', 'ma', 'for', 'please', 'kripaya', 'gari', 'dinuhos', 'बारेमा'];
        const words = input.split(/\s+/).filter(w => !stopWords.includes(w) && w.length > 2);
        
        if (words.length > 0) {
            const keyword = words[0];
            const found = complaints.filter(c => 
                (c.description || '').toLowerCase().includes(keyword) || 
                (c.complainant || '').toLowerCase().includes(keyword) ||
                (c.accused || '').toLowerCase().includes(keyword)
            );
            
            if (found.length > 0) {
                let resp = `<strong>"${keyword}"</strong> सँग सम्बन्धित ${found.length} वटा उजुरी भेटिए:<br>`;
                found.slice(0, 3).forEach(c => {
                    resp += `• <a href="#" onclick="viewComplaint('${c.id}')">${c.id}</a>: ${c.description.substring(0, 20)}...<br>`;
                });
                if (found.length > 3) resp += `...र अन्य ${found.length - 3} वटा।`;

                // SET CONTEXT
                state.chatContext = {
                    topic: 'keyword_search',
                    lastKeyword: keyword,
                    timestamp: now
                };
                return resp;
            }
        }
    }

    // 14. शाखा जानकारी (Shakha Info)
    if (input.match(/(shakha|branch|division|शाखा|महाशाखा)/)) {
        // Check for specific branch stats
        for (const [key, val] of Object.entries(SHAKHA)) {
            if (input.includes(val.toLowerCase()) || input.includes(key.toLowerCase())) {
                const count = complaints.filter(c => c.shakha === val || c.shakha === key).length;
                
                // SET CONTEXT
                state.chatContext = {
                    topic: 'shakha_info',
                    lastShakha: val,
                    timestamp: now
                };
                return `<strong>${val}</strong> मा हाल कुल <strong>${count}</strong> उजुरी छन्।`;
            }
        }
        return 'सतर्कता केन्द्रमा प्रशासन, प्रहरी, प्राविधिक र नीति निर्माण गरी ४ महाशाखाहरू र विभिन्न शाखाहरू छन्। तपाईं कुन शाखाको बारेमा जान्न चाहनुहुन्छ?';
    }

    // 15. Page Content / Keywords Matching (Dynamic)
    // Check against SHAKHA
    for (const [key, value] of Object.entries(SHAKHA)) {
        if (input.includes(value.toLowerCase()) || input.includes(key.replace(/_/g, ' '))) {
            return `<strong>${value}</strong> राष्ट्रिय सतर्कता केन्द्रको एक महत्वपूर्ण शाखा हो।<br>यसले सम्बन्धित क्षेत्रको उजुरी व्यवस्थापन र अनुगमन गर्दछ।`;
        }
    }

    // Check against MAHASHAKHA
    for (const [key, value] of Object.entries(MAHASHAKHA)) {
        if (input.includes(value.toLowerCase())) {
            return `<strong>${value}</strong> अन्तर्गत विभिन्न शाखाहरू रहेका छन्।`;
        }
    }
    
    // Check specific UI elements mentioned in HTML
    if (input.includes('admin panel') || input.includes('एडमिन प्यानल')) {
        return 'एडमिन प्यानलबाट प्रणालीको पूर्ण व्यवस्थापन गर्न सकिन्छ। यसका लागि एडमिन अधिकार आवश्यक पर्दछ।';
    }
    if (input.includes('complaint') || input.includes('उजुरी')) {
        return 'उजुरी व्यवस्थापन प्रणाली मार्फत तपाईंले उजुरी दर्ता, स्थिति जानकारी र फछ्रयौट विवरण हेर्न सक्नुहुन्छ।';
    }
    if (input.includes('settings') || input.includes('सेटिङ')) {
        return 'सेटिङ मेनुबाट तपाईंले आफ्नो प्रोफाइल, पासवर्ड र प्रणालीको अन्य प्राथमिकताहरू परिवर्तन गर्न सक्नुहुन्छ।';
    }

    // 16. Fallback Context Matching (Webpage words)
    if (input.match(/(admin|planning|yojana|police|prahari|technical|prabidhik|policy|niti|kanun|legal|arthik|finance)/)) {
        return `तपाईंले "${input}" सँग सम्बन्धित जानकारी खोज्नुभएको जस्तो छ। कृपया सम्बन्धित शाखाको ड्यासबोर्डमा जानुहोस् वा विशिष्ट प्रश्न सोध्नुहोस्।`;
    }

    // Default Response (Randomized)
    const defaults = [
        'माफ गर्नुहोला, मैले बुझिन। कृपया अलि स्पष्टसँग सोध्नुहोस्।',
        'मैले प्रश्न बुझ्न सकिन। तपाईं "help" टाइप गरेर उदाहरण हेर्न सक्नुहुन्छ।',
        'क्षमा पाउँ, म अझै सिक्दै छु। तपाईंले उजुरी, आयोजना वा सम्पर्कबारे सोध्न सक्नुहुन्छ।',
        'तपाईंले के भन्न खोज्नुभएको हो? कृपया "कुल उजुरी", "सम्पर्क" वा उजुरी नम्बर लेख्नुहोस्।'
    ];
    return defaults[Math.floor(Math.random() * defaults.length)];
  },
  
  generateReport: function(complaints) {
      if (!complaints || complaints.length === 0) return "विश्लेषण गर्न पर्याप्त डाटा छैन।";
      
      const total = complaints.length;
      const pending = complaints.filter(c => c.status === 'pending').length;
      const resolved = complaints.filter(c => c.status === 'resolved').length;
      
      // Most common category
      const categories = {};
      complaints.forEach(c => {
          const analysis = this.analyzeComplaint(c.description || '');
          categories[analysis.category] = (categories[analysis.category] || 0) + 1;
      });
      
      const topCategory = Object.keys(categories).reduce((a, b) => categories[a] > categories[b] ? a : b);
      
      return `
      <strong>AI प्रणाली विश्लेषण रिपोर्ट:</strong><br><br>
      हाल प्रणालीमा कुल <strong>${total}</strong> उजुरीहरू छन्।<br>
      जसमध्ये <strong>${Math.round((resolved/total)*100)}%</strong> फछ्रयौट भइसकेका छन् भने <strong>${pending}</strong> उजुरीहरू हेर्न बाँकी छन्。<br><br>
      सबैभन्दा बढी उजुरीहरू <strong>"${topCategory}"</strong> श्रेणीसँग सम्बन्धित देखिन्छन्।<br>
      सुझाव: ${pending > 10 ? 'बाँकी उजुरीहरूको संख्या उच्च छ, कृपया प्राथमिकता दिनुहोस्।' : 'कार्यसम्पादन सन्तोषजनक देखिन्छ।'}
      `;
  },

  suggestShakha: function(description) {
    if (!description) return 'COMPLAINT_MANAGEMENT';
    const text = description.toLowerCase();
    
    if (this.keywords.technical.some(k => text.includes(k))) return 'TECHNICAL_1';
    if (this.keywords.police.some(k => text.includes(k))) return 'POLICE_MONITORING';
    if (this.keywords.admin.some(k => text.includes(k))) return 'ADMIN_PLANNING';
    if (text.match(/(नीति|कानून|नियम|ऐन|policy|law|legal)/)) return 'POLICY_MONITORING';
    if (text.match(/(सम्पत्ति|विवरण|asset|property)/)) return 'ASSET_DECLARATION';
    
    return 'COMPLAINT_MANAGEMENT';
  }
};

// ==================== AI INSIGHTS (RULE-BASED) ====================
const AI_INSIGHTS = {
    generateInsights: function(complaints) {
        if (!complaints || complaints.length === 0) {
            return [{
                type: 'info',
                icon: 'fa-info-circle',
                message: 'विश्लेषण गर्न पर्याप्त उजुरी डाटा छैन।'
            }];
        }

        const insights = [];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // --- 1. Trend Analysis (Current Month vs Last Month) ---
        const thisMonthComplaints = complaints.filter(c => {
            const d = new Date(c.entryDate || c.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        
        let lastMonth = currentMonth - 1;
        let lastMonthYear = currentYear;
        if (lastMonth < 0) { lastMonth = 11; lastMonthYear--; }
        
        const lastMonthComplaints = complaints.filter(c => {
            const d = new Date(c.entryDate || c.date);
            return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        });

        let trendText = "";
        if (thisMonthComplaints.length > lastMonthComplaints.length) {
            trendText = "हालको महिनामा उजुरी संख्यामा उल्लेखनीय वृद्धि देखिएको छ।";
        } else if (thisMonthComplaints.length < lastMonthComplaints.length) {
            trendText = "गत महिनाको तुलनामा यस महिना उजुरी संख्यामा केही कमी आएको छ।";
        } else {
            trendText = "उजुरी दर्ताको प्रवृत्ति स्थिर देखिन्छ।";
        }

        // --- 2. Shakha Analysis (Highest Volume) ---
        const shakhaCounts = {};
        complaints.forEach(c => {
            const s = c.shakha || 'अन्य';
            shakhaCounts[s] = (shakhaCounts[s] || 0) + 1;
        });
        
        let topShakha = '';
        let maxCount = 0;
        for (const [shakha, count] of Object.entries(shakhaCounts)) {
            if (count > maxCount) { maxCount = count; topShakha = shakha; }
        }
        
        let shakhaText = "";
        if (topShakha) {
            shakhaText = `विशेषगरी <strong>${topShakha}</strong> शाखामा बढी उजुरी (${maxCount}) आएको पाइन्छ।`;
        }

        // --- 3. Status & Suggestion ---
        const total = complaints.length;
        const pending = complaints.filter(c => c.status === 'pending');
        const pendingCount = pending.length;
        const pendingPercentage = total > 0 ? Math.round((pendingCount / total) * 100) : 0;
        
        let statusText = "";
        let suggestionText = "";
        
        if (pendingPercentage > 50) {
            statusText = `Pending उजुरी संख्या उच्च (${pendingPercentage}%) देखिन्छ`;
            suggestionText = "जसले कार्यसम्पादन सुधार आवश्यक रहेको संकेत गर्दछ।";
        } else if (pendingPercentage > 20) {
            statusText = `करिब ${pendingPercentage}% उजुरीहरू प्रक्रियामा छन्`;
            suggestionText = "र नियमित अनुगमन आवश्यक देखिन्छ।";
        } else {
            statusText = `फछ्र्यौट स्थिति सन्तोषजनक छ`;
            suggestionText = "र कार्यसम्पादन प्रभावकारी देखिन्छ।";
        }

        // Combine Narrative
        const narrative = `${trendText} ${shakhaText} ${statusText} ${suggestionText}`;

        // Add Narrative Insight (Main)
        insights.push({
            type: 'info',
            icon: 'fa-robot',
            message: narrative
        });

        // --- 4. Critical Alerts (Old Pending > 30 Days) ---
        const oldPending = pending.filter(c => {
            const dateStr = c.entryDate || c.date;
            if (!dateStr) return false;
            try {
                const complaintDate = new Date(dateStr);
                if (isNaN(complaintDate.getTime())) return false;
                const diffTime = now - complaintDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                return diffDays > 30;
            } catch(e) { return false; }
        });

        if (oldPending.length > 0) {
            insights.push({
                type: 'critical',
                icon: 'fa-exclamation-triangle',
                message: `<span style="color: #d32f2f; font-weight: bold;">ध्यान दिनुहोस्: ${oldPending.length} वटा उजुरी ३० दिन भन्दा बढी समयदेखि प्रक्रियामा छन्।</span>`
            });
        }

        return insights;
    }
};

// ==================== CONFIGURATION ====================
const CONFIG = {
  APP_NAME: 'राष्ट्रिय सतर्कता केन्द्र',
  APP_VERSION: '2.0.0',
  DEFAULT_PAGE: 'mainPage',
  DATE_FORMAT: 'YYYY-MM-DD',
  NEPALI_MONTHS: {
    1: "बैशाख", 2: "जेठ", 3: "असार", 4: "साउन", 
    5: "भदौ", 6: "असोज", 7: "कार्तिक", 8: "मंसिर", 
    9: "पुष", 10: "माघ", 11: "फागुन", 12: "चैत"
  }
};

// ==================== DATA MODELS ====================
const MAHASHAKHA = {
  ADMIN_MONITORING: 'प्रशासन तथा अनुगमन महाशाखा',
  POLICY_LEGAL: 'नीति निर्माण तथा कानूनी राय परामर्श महाशाखा',
  POLICE: 'प्रहरी महाशाखा',
  TECHNICAL: 'प्राविधिक परीक्षण तथा अनुगमन महाशाखा'
};

const SHAKHA = {
  ADMIN_PLANNING: 'प्रशासन तथा योजना शाखा',
  INFO_COLLECTION: 'सूचना संकलन तथा अनुगमन शाखा',
  COMPLAINT_MANAGEMENT: 'उजुरी व्यवस्थापन तथा अनुगमन शाखा',
  FINANCE: 'आर्थिक प्रशासन शाखा',
  
  POLICY_MONITORING: 'नीति निर्माण तथा अनुगमन शाखा',
  INVESTIGATION: 'छानबिन, अन्वेषण तथा अनुगमन शाखा',
  LEGAL_ADVICE: 'कानूनी राय तथा परामर्श शाखा',
  ASSET_DECLARATION: 'सम्पत्ति विवरण तथा अनुगमन शाखा',
  
  POLICE_INFO_COLLECTION: 'सूचना संकलन तथा अन्वेषण शाखा',
  POLICE_MONITORING: 'निगरानी तथा अनुगमन शाखा',
  POLICE_MANAGEMENT: 'प्रहरी व्यवस्थापन शाखा',
  POLICE_INVESTIGATION: 'अन्वेषण तथा अनुगमन शाखा',
  
  TECHNICAL_1: 'प्राविधिक परीक्षण तथा अनुगमन शाखा १',
  TECHNICAL_2: 'प्राविधिक परीक्षण तथा अनुगमन शाखा २',
  TECHNICAL_3: 'प्राविधिक परीक्षण तथा अनुगमन शाखा ३',
  TECHNICAL_4: 'प्राविधिक परीक्षण तथा अनुगमन शाखा ४'
};

const DECISION_TYPES = {
  1: 'उजुरीका सम्बन्धमा केही गर्न नपर्ने',
  2: 'राय प्रतिक्रिया सहित कागजात माग गर्ने',
  3: 'छानबिन गरी राय सहितको प्रतिवेदन पेश गर्न लगाउने',
  4: 'छानविन तथा कारबाही गरी जानकारी दिन लेखी पठाउने',
  5: 'अख्तियार दुरुपयोग अनुसन्धान आयोगमा लेखि पठाउने',
  6: 'उजुरी अन्य निकायमा पठाउने',
  7: 'अन्य कार्य गर्ने'
};

const FINAL_DECISION_TYPES = {
  1: 'तामेली',
  2: 'सुझाव/निर्देशन दिने',
  3: 'सतर्क गर्ने',
  4: 'अन्य निर्णय'
};

const STATUS_TYPES = {
  PENDING: 'काम बाँकी',
  IN_PROGRESS: 'चालु',
  RESOLVED: 'फछ्रयौट',
};

const MAHASHAKHA_STRUCTURE = {
  [MAHASHAKHA.ADMIN_MONITORING]: [SHAKHA.ADMIN_PLANNING, SHAKHA.INFO_COLLECTION, SHAKHA.COMPLAINT_MANAGEMENT, SHAKHA.FINANCE],
  [MAHASHAKHA.POLICY_LEGAL]: [SHAKHA.POLICY_MONITORING, SHAKHA.INVESTIGATION, SHAKHA.LEGAL_ADVICE, SHAKHA.ASSET_DECLARATION],
  [MAHASHAKHA.POLICE]: [SHAKHA.POLICE_INFO_COLLECTION, SHAKHA.POLICE_MONITORING, SHAKHA.POLICE_MANAGEMENT, SHAKHA.POLICE_INVESTIGATION],
  [MAHASHAKHA.TECHNICAL]: [SHAKHA.TECHNICAL_1, SHAKHA.TECHNICAL_2, SHAKHA.TECHNICAL_3, SHAKHA.TECHNICAL_4]
};

// script.js मा थप्ने - उजुरी फारममा स्थान फिल्ड
const LOCATION_FIELDS = {
  PROVINCE: {
    1: 'कोशी प्रदेश',
    2: 'मधेश प्रदेश',
    3: 'बागमती प्रदेश',
    4: 'गण्डकी प्रदेश',
    5: 'लुम्बिनी प्रदेश',
    6: 'कर्णाली प्रदेश',
    7: 'सुदूरपश्चिम प्रदेश'
  },
  DISTRICTS: {
    1: ['ताप्लेजुङ', 'पाँचथर', 'इलाम', 'झापा', 'मोरङ', 'सुनसरी', 'धनकुटा', 'तेह्रथुम', 'संखुवासभा', 'भोजपुर', 'सोलुखुम्बु', 'ओखलढुंगा', 'खोटाङ', 'उदयपुर'],
    2: ['सप्तरी', 'सिराहा', 'धनुषा', 'महोत्तरी', 'सर्लाही', 'रौतहट', 'बारा', 'पर्सा'],
    3: ['सिन्धुली', 'रामेछाप', 'दोलखा', 'सिन्धुपाल्चोक', 'काभ्रेपलाञ्चोक', 'ललितपुर', 'भक्तपुर', 'काठमाडौं', 'नुवाकोट', 'रसुवा', 'धादिङ', 'चितवन', 'मकवानपुर'],
    4: ['गोरखा', 'लमजुङ', 'तनहुँ', 'कास्की', 'मनाङ', 'मुस्ताङ', 'पर्वत', 'स्याङ्जा', 'म्याग्दी', 'बाग्लुङ', 'नवलपुर'],
    5: ['नवलपरासी (बर्दघाट सुस्ता पश्चिम)', 'रुपन्देही', 'कपिलवस्तु', 'पाल्पा', 'अर्घाखाँची', 'गुल्मी', 'रोल्पा', 'प्युठान', 'दाङ', 'बाँके', 'बर्दिया', 'पूर्वी रुकुम'],
    6: ['पश्चिम रुकुम', 'सल्यान', 'सुर्खेत', 'दैलेख', 'जाजरकोट', 'डोल्पा', 'हुम्ला', 'जुम्ला', 'कालिकोट', 'मुगु'],
    7: ['बाजुरा', 'बझाङ', 'डोटी', 'अछाम', 'दार्चुला', 'बैतडी', 'डडेल्धुरा', 'कञ्चनपुर', 'कैलाली']
  },
  MUNICIPALITIES: {
    // प्रमुख नगरपालिकाहरू
  }
};

// ==================== GLOBAL STATE ====================
const state = {
  currentUser: null,
  currentPage: CONFIG.DEFAULT_PAGE,
  currentShakha: null,
  notifications: [],
  complaints: [],
  projects: [],
  employeeMonitoring: [],
  citizenCharters: [],
  users: [],
  filters: {},
  currentView: 'dashboard',
  pagination: {
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0
  },
  useLocalData: false,
  previousNotificationIds: null,
  notificationFilter: 'all',
  chatContext: null // च्याटको सन्दर्भ (context) राख्न
};

// ==================== GLOBAL CHART STORAGE ====================
window.nvcCharts = {};


// ==================== NEPALI DATE FUNCTIONS (सही गरिएको) ====================

// नेपाली मिति API प्रयोग गरेर आजको मिति प्राप्त गर्ने
function getCurrentNepaliDate() {
    // फारमको लागि नेपाली मिति YYYY-MM-DD format मा
    if (typeof NepaliDatePicker !== 'undefined' && NepaliDatePicker.ad2bs) {
        try {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const adDateStr = `${year}-${month}-${day}`;
            const bsDateStr = NepaliDatePicker.ad2bs(adDateStr);
            if (bsDateStr) {
                // bsDateStr यसरी आउँछ: "YYYY-MM-DD"
                return bsDateStr;
            }
        } catch (e) {
            console.warn('NepaliDatePicker.ad2bs failed in getCurrentNepaliDate', e);
        }
    }
    // Check for NepaliFunctions (v5.x) - index.html मा v5 लोड भएकोले यो आवश्यक छ
    if (typeof NepaliFunctions !== 'undefined' && NepaliFunctions.AD2BS) {
        try {
            const dt = new Date();
            const bs = NepaliFunctions.AD2BS({ year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate() });
            if (bs) {
                return `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`;
            }
        } catch (e) {
            console.warn('NepaliFunctions.AD2BS failed', e);
        }
    }
    // Fallback: आजको AD date (for backend)
    return new Date().toISOString().slice(0, 10);
}

// Initialize inline Nepali dropdown selectors (year / month / day)
function initializeNepaliDropdowns() {
  const nepaliMonths = ["बैशाख","जेठ","असार","साउन","भदौ","असोज","कार्तिक","मंसिर","पुष","माघ","फागुन","चैत"];
  const monthDays = [30,31,32,31,32,30,30,29,30,29,30,30];

  document.querySelectorAll('.nepali-datepicker-dropdown').forEach(wrapper => {
    try {
      // avoid double-initializing the same wrapper
      if (wrapper.dataset.ndpDropdownInit === 'true') return;
      const target = wrapper.dataset.target;
      if (!target) return;
      const hidden = document.getElementById(target);
      // Ensure year/month/day selects exist — create if missing
      let yearEl = wrapper.querySelector('.bs-year');
      let monthEl = wrapper.querySelector('.bs-month');
      let dayEl = wrapper.querySelector('.bs-day');

      function createSelect(cls, placeholderText, small) {
        const s = document.createElement('select');
        s.className = `form-select bs-${cls}` + (small ? ' form-select-sm' : '');
        const ph = document.createElement('option'); ph.value = ''; ph.textContent = placeholderText; ph.disabled = true; ph.selected = true; s.appendChild(ph);
        return s;
      }

      if (!yearEl) { yearEl = createSelect('year', 'साल'); wrapper.insertBefore(yearEl, wrapper.firstChild); }
      if (!monthEl) { monthEl = createSelect('month', 'महिना'); wrapper.insertBefore(monthEl, yearEl.nextSibling); }
      if (!dayEl) { dayEl = createSelect('day', 'गते'); wrapper.appendChild(dayEl); }

      const currentBs = (getCurrentNepaliDate() || '').split('-');
      const cy = parseInt(currentBs[0], 10) || (new Date().getFullYear() + 57);

      // populate year select with placeholder (if only placeholder present, append years)
      if (yearEl && yearEl.options.length <= 1) {
        // remove extra placeholder if any then re-add disabled placeholder as first
        if (yearEl.options.length === 1) yearEl.innerHTML = '';
        const ph = document.createElement('option'); ph.value = ''; ph.textContent = 'साल'; ph.disabled = true; ph.selected = true; yearEl.appendChild(ph);
        for (let y = cy - 5; y <= cy + 5; y++) {
          const o = document.createElement('option'); o.value = y; o.textContent = _latinToDevnagari(String(y)); yearEl.appendChild(o);
        }
      }

      // populate months with placeholder
      if (monthEl && monthEl.options.length <= 1) {
        if (monthEl.options.length === 1) monthEl.innerHTML = '';
        const phm = document.createElement('option'); phm.value = ''; phm.textContent = 'महिना'; phm.disabled = true; phm.selected = true; monthEl.appendChild(phm);
        nepaliMonths.forEach((m, i) => { const o = document.createElement('option'); o.value = i + 1; o.textContent = m; monthEl.appendChild(o); });
      }

      // determine initial values
      const val = (hidden && hidden.value) ? hidden.value : getCurrentNepaliDate();
      const parts = (val || '').split('-');
      const initY = parts[0] || cy;
      const initM = parseInt(parts[1] || '1', 10);
      const initD = parseInt(parts[2] || '1', 10);

      // If hidden has value, set selects to that value; otherwise leave placeholders
      if (yearEl) yearEl.value = (hidden && hidden.value) ? initY : '';
      if (monthEl) monthEl.value = (hidden && hidden.value) ? initM : '';

      function refreshDays(selectedY, selectedM, selectDay) {
        if (!dayEl) return;
        // Always show days 1..32 as requested
        const total = 32;
        dayEl.innerHTML = '';
        const phd = document.createElement('option'); phd.value = ''; phd.textContent = 'गते'; phd.disabled = true; dayEl.appendChild(phd);
        for (let dd = 1; dd <= total; dd++) {
          const o = document.createElement('option'); o.value = dd; o.textContent = _latinToDevnagari(String(dd)); dayEl.appendChild(o);
        }
        // if hidden has a value, set selected day; else keep placeholder
        if (hidden && hidden.value) {
          const p = (hidden.value || '').split('-');
          const curD = parseInt(p[2], 10) || selectDay || 1;
          dayEl.value = Math.min(curD, total);
        } else {
          dayEl.value = '';
        }
      }

      refreshDays(parseInt(yearEl.value || cy, 10), parseInt(monthEl.value || 1, 10), initD);

      function updateHidden() {
        if (!hidden) return;
        // Only set hidden value when all selects have valid non-empty values
        if (!yearEl.value || !monthEl.value || !dayEl.value) {
          hidden.value = '';
          hidden.dispatchEvent(new Event('input', { bubbles: true }));
          hidden.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
        const yy = String(yearEl.value).padStart(4, '0');
        const mm = String(monthEl.value).padStart(2, '0');
        const dd = String(dayEl.value).padStart(2, '0');
        hidden.value = `${yy}-${mm}-${dd}`;
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
        hidden.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (yearEl) yearEl.addEventListener('change', () => { refreshDays(parseInt(yearEl.value, 10), parseInt(monthEl.value, 10), 1); updateHidden(); });
      if (monthEl) monthEl.addEventListener('change', () => { refreshDays(parseInt(yearEl.value, 10), parseInt(monthEl.value, 10), 1); updateHidden(); });
      if (dayEl) dayEl.addEventListener('change', updateHidden);

      // initial sync
      updateHidden();
      // mark as initialized to prevent duplicate listeners on repeated calls
      wrapper.dataset.ndpDropdownInit = 'true';
    } catch (e) {
      console.warn('Nepali dropdown init failed', e);
    }
  });
}

// ensure dropdowns are initialized after datepicker init
setTimeout(() => { try { initializeNepaliDropdowns(); } catch(e) { console.warn('init nepali dropdowns failed', e); } }, 40);

// Watch for dynamic DOM insertions and initialize dropdowns for newly added forms
if (typeof MutationObserver !== 'undefined') {
  try {
    const _ndpObserver = new MutationObserver(mutations => {
      let trigger = false;
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (n && n.nodeType === 1) {
            if (n.matches && n.matches('.nepali-datepicker-dropdown')) { trigger = true; break; }
            if (n.querySelector && n.querySelector('.nepali-datepicker-dropdown')) { trigger = true; break; }
          }
        }
        if (trigger) break;
      }
      if (trigger) setTimeout(() => { try { initializeNepaliDropdowns(); } catch(e){} }, 40);
    });
    _ndpObserver.observe(document.documentElement || document.body, { childList: true, subtree: true });
  } catch(e) { /* ignore */ }
}

// ==================== NEPALI DATE FUNCTIONS (सुधारिएको) ====================

// नेपाली मिति API प्रयोग गरेर आजको मिति प्राप्त गर्ने
function getCurrentNepaliDate() {
    // पहिलो प्राथमिकता: NepaliDatePicker (v5.x)
    if (typeof NepaliDatePicker !== 'undefined' && typeof NepaliDatePicker.ad2bs === 'function') {
        try {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const adDateStr = `${year}-${month}-${day}`;
            
            // console.log('AD Date for conversion:', adDateStr);
            const bsDateStr = NepaliDatePicker.ad2bs(adDateStr);
            
            if (bsDateStr && bsDateStr !== adDateStr) {
                // bsDateStr format: "YYYY-MM-DD"
                return bsDateStr;
            }
        } catch (e) {
            console.warn('NepaliDatePicker.ad2bs failed:', e);
        }
    }
    
    // दोस्रो प्राथमिकता: jQuery plugin
    if (typeof $ !== 'undefined' && $.fn && $.fn.nepaliDatePicker && $.fn.nepaliDatePicker.ad2bs) {
        try {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const adDateStr = `${year}-${month}-${day}`;
            
            const bsDateStr = $.fn.nepaliDatePicker.ad2bs(adDateStr);
            if (bsDateStr) {
                return bsDateStr;
            }
        } catch (e) {
            console.warn('jQuery ad2bs failed:', e);
        }
    }
    
    // तेस्रो प्राथमिकता: NepaliFunctions (v5.x)
    if (typeof NepaliFunctions !== 'undefined' && NepaliFunctions.AD2BS) {
        try {
            const dt = new Date();
            const bs = NepaliFunctions.AD2BS({ 
                year: dt.getFullYear(), 
                month: dt.getMonth() + 1, 
                day: dt.getDate() 
            });
            
            if (bs && bs.year && bs.month && bs.day) {
                return `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`;
            }
        } catch (e) {
            console.warn('NepaliFunctions.AD2BS failed:', e);
        }
    }
    
    // चौथो प्राथमिकता: Fallback (hardcoded for 2081)
    // यो सन् २०२५ मा २०८१ चैत देखि २०८२ बैशाख सम्म
    console.warn('⚠️ Using fallback Nepali date calculation');
    return getFallbackNepaliDate();
    
    // Fix: Return ISO format (YYYY-MM-DD) for form values and validation
    const today = new Date();
    const adDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return convertADtoBS(adDateStr) || "2082-11-14";
}

// Helper: Convert Devanagari digits to Latin digits
function _devnagariToLatin(s) {
  if (!s) return s;
  const map = { '०':'0','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7','८':'8','९':'9' };
  return s.replace(/[०-९]/g, d => map[d] || d);
}

// Helper: Convert Latin digits to Devanagari digits (string)
function _latinToDevnagari(s) {
  if (s === null || s === undefined) return s;
  const map = { '0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९' };
  return String(s).replace(/[0-9]/g, d => map[d] || d);
}

// Helper: map Nepali month name to month number
function _nepaliMonthNameToNumber(name) {
  if (!name) return null;
  const m = {
    'बैशाख':1,'जेठ':2,'असार':3,'साउन':4,'भदौ':5,'असोज':6,
    'कार्तिक':7,'मंसिर':8,'पुष':9,'माघ':10,'फागुन':11,'चैत':12
  };
  const key = name.replace(/[,\s]/g, '').trim();
  return m[key] || null;
}

// Normalize various Nepali date display forms into YYYY-MM-DD (ASCII digits)
function normalizeNepaliDisplayToISO(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  // convert devanagari digits first
  s = _devnagariToLatin(s);

  // If already looks like YYYY-MM-DD after conversion, return padded
  const dashMatch = s.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
  if (dashMatch) {
    const y = dashMatch[1];
    const mo = String(dashMatch[2]).padStart(2, '0');
    const d = String(dashMatch[3]).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }

  // Try patterns like: "2082 फागुन 9, शुक्रवार" or "2082 फागुन ९"
  const tokens = s.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    // year is usually first token
    const yearToken = tokens[0].replace(/[^0-9]/g, '');
    let monthToken = tokens[1].replace(/[^\u0900-\u097Fa-zA-Z]/g, '');
    let dayToken = '';
    // find first token that contains digits for day
    for (let i=2;i<tokens.length;i++) {
      const t = tokens[i].replace(/[,\s]/g, '');
      if (t.match(/\d/)) { dayToken = t.replace(/[^0-9]/g,''); break; }
    }
    // sometimes day is the second token (e.g., "फागुन ९") if year omitted - but we expect year
    if (!dayToken && tokens[2] && tokens[2].match(/\d/)) dayToken = tokens[2].replace(/[^0-9]/g,'');

    const monthNumber = _nepaliMonthNameToNumber(monthToken) || (tokens[1].match(/\d+/) ? Number(tokens[1]) : null);
    if (yearToken && monthNumber && dayToken) {
      return `${yearToken}-${String(monthNumber).padStart(2,'0')}-${String(dayToken).padStart(2,'0')}`;
    }
  }

  // Fallback: strip nondigits and try to parse YYYYMMDD
  const digits = s.replace(/[^0-9]/g,'');
  if (digits.length === 8) {
    return `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`;
  }

  // Last resort: return original trimmed (but ASCII digits)
  return s;
}

async function updateNepaliDate() {
    const nepaliDateElement = document.getElementById('currentNepaliDate');
    if (!nepaliDateElement) return;
  // Use centralized converter that tries libraries then fallback heuristic
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const adDateStr = `${year}-${month}-${day}`;

    const bsDateStr = convertADtoBS(adDateStr);
    if (bsDateStr) {
      const [bsYear, bsMonth, bsDay] = bsDateStr.split('-');
      const nepaliMonths = ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कार्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"];
      const weekdays = ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"];
      const monthName = nepaliMonths[Number(bsMonth) - 1] || "बैशाख";
      const dayName = weekdays[today.getDay()];
      nepaliDateElement.textContent = `${bsYear} ${monthName} ${Number(bsDay)}, ${dayName}`;
      return;
    }
  } catch (e) {
    console.warn('updateNepaliDate conversion failed, falling back:', e);
  }

  // Fallback: पुरानो गणना
  nepaliDateElement.textContent = getFallbackNepaliDate();
}

// Fallback function (यदि API fail भयो भने)
// Fallback function (यदि API fail भयो भने)
function getFallbackNepaliDate() {
    const now = new Date();
    
    // 2025-02-16 (AD) = 2081-11-03 (BS) - फागुन ३, २०८१
    // यो लगभग सही छ, तर पूर्ण सटीक छैन
    
    // महिनाको दिन संख्या (बैशाख देखि चैत सम्म)
    const monthDays = [30, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30];
    const nepaliMonths = ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", 
                         "कार्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"];
    const weekdays = ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", 
                     "बिहीबार", "शुक्रबार", "शनिबार"];
    
    // Reference date: 2025-02-16 = 2081-11-03
    const refAD = new Date(2025, 1, 16); // month is 0-indexed: 1 = February
    const refBS = { year: 2081, month: 11, day: 3 }; // month 11 = फागुन
    
    // दिनको अन्तर निकाल्ने
    const diffTime = now - refAD;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    let bsYear = refBS.year;
    let bsMonth = refBS.month;
    let bsDay = refBS.day + diffDays;
    
    // महिना अनुसार दिन समायोजन गर्ने
    while (bsDay > monthDays[bsMonth - 1]) {
        bsDay -= monthDays[bsMonth - 1];
        bsMonth++;
        if (bsMonth > 12) {
            bsMonth = 1;
            bsYear++;
        }
    }
    
    // यदि दिन १ भन्दा कम भयो भने (अघिल्लो महिनामा जानुपर्छ)
    while (bsDay < 1) {
        bsMonth--;
        if (bsMonth < 1) {
            bsMonth = 12;
            bsYear--;
        }
        bsDay += monthDays[bsMonth - 1];
    }
    
    const monthName = nepaliMonths[bsMonth - 1] || "बैशाख";
    const dayName = weekdays[now.getDay()];
    
    return `${bsYear} ${monthName} ${bsDay}, ${dayName}`;
}

// Convert AD YYYY-MM-DD to BS YYYY-MM-DD using available libraries or fallback
function convertADtoBS(adDateStr) {
  if (!adDateStr) return '';
  try {
    // If already looks like BS (year >= 2050), assume it's BS
    const m = String(adDateStr).trim().match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      const y = Number(m[1]);
      if (y >= 2050) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
      // AD -> try available converters
      if (typeof NepaliDatePicker !== 'undefined' && typeof NepaliDatePicker.ad2bs === 'function') {
        const res = NepaliDatePicker.ad2bs(`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`);
        if (res) return res;
      }
      if (typeof $ !== 'undefined' && $.fn && $.fn.nepaliDatePicker && typeof $.fn.nepaliDatePicker.ad2bs === 'function') {
        const res = $.fn.nepaliDatePicker.ad2bs(`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`);
        if (res) return res;
      }
      if (typeof NepaliFunctions !== 'undefined' && typeof NepaliFunctions.AD2BS === 'function') {
        try {
          const res = NepaliFunctions.AD2BS(m[1], m[2], m[3]);
          if (typeof res === 'string' && res.indexOf('-') !== -1) return res;
          if (res && res.year) return `${res.year}-${String(res.month).padStart(2,'0')}-${String(res.day).padStart(2,'0')}`;
        } catch (e) { /* ignore */ }
      }
      // Last resort: try local heuristic similar to fallback mapping
      // Parse AD date and shift by reference
      const parts = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (parts.every(n => !isNaN(n))) {
        // Use the same algorithm as vendor shim
        const refAD = new Date(2025, 1, 16);
        const target = new Date(parts[0], parts[1]-1, parts[2]);
        const diffDays = Math.round((target - refAD) / (1000*60*60*24));
        const monthDays = [30,31,32,31,32,30,30,29,30,29,30,30];
        let bsYear = 2081, bsMonth = 11, bsDay = 3 + diffDays;
        while (bsDay > monthDays[bsMonth - 1]) { bsDay -= monthDays[bsMonth - 1]; bsMonth++; if (bsMonth>12){bsMonth=1;bsYear++;} }
        while (bsDay < 1) { bsMonth--; if (bsMonth<1){bsMonth=12;bsYear--;} bsDay += monthDays[bsMonth-1]; }
        return `${bsYear}-${String(bsMonth).padStart(2,'0')}-${String(bsDay).padStart(2,'0')}`;
      }
    }
  } catch (e) {
    console.warn('convertADtoBS failed:', e);
  }
  return '';
}

function ensureBSDate(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  // If contains Devanagari or Nepali month names, normalize
  if (/[\u0900-\u097F]/.test(s) || /[बैशाख|जेठ|फागुन|चैत]/.test(s)) {
    const normalized = normalizeNepaliDisplayToISO(s);
    if (normalized) return normalized;
  }
  // If already ISO-like
  const isoMatch = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    if (year >= 2050) return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2,'0')}-${String(isoMatch[3]).padStart(2,'0')}`;
    // likely AD, convert
    const converted = convertADtoBS(s);
    return converted || `${isoMatch[1]}-${String(isoMatch[2]).padStart(2,'0')}-${String(isoMatch[3]).padStart(2,'0')}`;
  }
  // Try to parse digits and convert
  const digits = s.replace(/[^0-9]/g,'');
  if (digits.length === 8) return `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`;
  return s;
}

// ==================== DATE PICKER FUNCTIONS (सुधारिएको) ====================
async function initializeDatepickers() {
    console.log('📅 Initializing datepickers...');
    
    // Fix z-index for modals
    if (!document.getElementById('ndp-custom-style')) {
        const style = document.createElement('style');
        style.id = 'ndp-custom-style';
        style.innerHTML = `
            .nepali-calendar, #ndp-nepali-box, .ndp-container, .ndp-popup, 
            .ndp-date-picker, .nepali-date-picker-container {
                z-index: 999999 !important;
                position: fixed !important;
            }
            .ndp-popup {
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                box-shadow: 0 5px 30px rgba(0,0,0,0.3) !important;
                border-radius: 8px !important;
            }
        `;
        document.head.appendChild(style);
    }

      // If no Nepali datepicker library is present, attempt to load the fallback and retry initialization
      if (!(typeof NepaliDatePicker !== 'undefined' || (typeof $ !== 'undefined' && $.fn && $.fn.nepaliDatePicker))) {
        if (!window._ndpTriedFallback) {
          window._ndpTriedFallback = true;
          console.warn('⚠️ NepaliDatePicker not detected. Attempting to load fallback library...');
          try {
            loadFallbackLibrary();
          } catch (e) {
            console.error('❌ loadFallbackLibrary failed:', e);
          }
          // retry after short delay to allow fallback script to load
          setTimeout(() => {
            initializeDatepickers(); initializeNepaliDropdowns();
          }, 800);
          return;
        } else {
          console.warn('⚠️ NepaliDatePicker still not available after fallback attempt. Date inputs will use fallback behavior.');
        }
      }

    // सबै nepali-datepicker-input क्लास भएका इनपुटहरूमा लागू गर्ने
    document.querySelectorAll('.nepali-datepicker-input').forEach(input => {
        // Ensure autocomplete is off
        input.setAttribute('autocomplete', 'off');
        
        // यदि पहिले नै initialize भएको छ भने नगर्ने
        if (input.dataset.ndpInitialized === 'true') return;
        
        // Options तयार गर्ने
        const options = {
            dateFormat: 'YYYY-MM-DD',
            closeOnDateSelect: true,
            language: 'nepali',  // नेपाली भाषा
            ndpYear: true,        // वर्ष देखाउने
            ndpMonth: true,       // महिना देखाउने
            ndpYearCount: 10,     // एक पटकमा देखाउने वर्ष संख्या
            onChange: function() {
                // म्यानुअल रूपमा event trigger गर्ने
              // Normalize displayed Nepali to ISO YYYY-MM-DD when possible
              try {
                const normalized = normalizeNepaliDisplayToISO(input.value || input.getAttribute('value') || '');
                if (normalized && normalized !== input.value) {
                  input.value = normalized;
                }
              } catch (e) {
                console.warn('normalizeNepaliDisplayToISO failed:', e);
              }

              input.dispatchEvent(new Event('change', { bubbles: true }));
              input.dispatchEvent(new Event('input', { bubbles: true }));
                
                // यदि मोडल भित्र छ भने, मोडललाई फोकस रहन दिने
                setTimeout(() => {
                    const modal = input.closest('.modal');
                    if (modal) {
                        modal.focus();
                    }
                }, 100);
            }
        };

        // Library check गर्ने
        if (typeof $ !== 'undefined' && $.fn && $.fn.nepaliDatePicker) {
            try {
                // jQuery plugin प्रयोग गर्ने
                $(input).nepaliDatePicker(options);
                input.dataset.ndpInitialized = 'true';
                console.log('✅ Nepali DatePicker initialized (jQuery) for:', input.id || input.className);
            } catch (e) {
                console.warn('⚠️ jQuery plugin failed, trying vanila...', e);
                tryVanillaDatePicker(input, options);
            }
        } 
        else if (typeof NepaliDatePicker !== 'undefined') {
            try {
                // Vanilla JS library प्रयोग गर्ने
                new NepaliDatePicker(input, options);
                input.dataset.ndpInitialized = 'true';
                console.log('✅ Nepali DatePicker initialized (Vanilla) for:', input.id || input.className);
            } catch (e) {
                console.warn('⚠️ Vanilla failed, trying fallback...', e);
                tryFallbackDatePicker(input);
            }
        }
        else {
            console.warn('⚠️ No NepaliDatePicker library found, using fallback');
            tryFallbackDatePicker(input);
        }

        // ensure clicking the field (or its icon) always opens the calendar
        input.addEventListener('click', () => {
            // focusing usually triggers the picker; call explicitly for safety
            input.focus();
            try {
                if (typeof $ !== 'undefined' && $.fn && $(input).data('nepaliDatePicker')) {
                    $(input).nepaliDatePicker('show');
                }
            } catch (_e) {
                // ignore
            }
            if (input._nepaliDatePickerInstance && typeof input._nepaliDatePickerInstance.show === 'function') {
                input._nepaliDatePickerInstance.show();
            }
        });

        // always keep numeric placeholder, library sometimes injects Nepali text
        if (!input.placeholder || /[\u0900-\u097F]/.test(input.placeholder)) {
          input.placeholder = 'YYYY-MM-DD';
        }

        // If the picker library inserted a textual Nepali date into the value on init, normalize it now
        try {
          const current = input.value || input.getAttribute('value') || '';
          const normalizedNow = normalizeNepaliDisplayToISO(current);
          if (normalizedNow && normalizedNow !== current) input.value = normalizedNow;
        } catch (e) { /* ignore */ }
    });
}

// Vanilla DatePicker प्रयास गर्ने हेल्पर फंक्सन
function tryVanillaDatePicker(input, options) {
    if (typeof NepaliDatePicker !== 'undefined') {
        try {
            new NepaliDatePicker(input, options);
            input.dataset.ndpInitialized = 'true';
            console.log('✅ Nepali DatePicker initialized (Vanilla fallback) for:', input.id);
            return true;
        } catch (e) {
            console.error('❌ Vanilla fallback also failed:', e);
        }
    }
    return false;
}

// Fallback DatePicker (साधारण अलर्ट वा कन्सोल)
function tryFallbackDatePicker(input) {
    // यदि library नै छैन भने, कमसेकम प्रयोगकर्तालाई सन्देश दिने
  console.warn('⚠️ Nepali DatePicker library not loaded for:', input.id);

  // Ensure placeholder
  if (!input.placeholder) input.placeholder = 'YYYY-MM-DD';

  // Attach simple in-page Nepali picker on click
  const handler = function(e) {
    e.preventDefault();
    console.log('🧭 fallback handler invoked for', input.id);
    showSimpleNepaliPicker(input);
  };
  input.addEventListener('click', handler);
  // Also respond to custom ndp show events (DOM and jQuery)
  const ndpDomHandler = function(e) {
    try { e.preventDefault(); } catch(_){}
    console.log('🧭 ndp:show event received for', input.id);
    showSimpleNepaliPicker(input);
  };
  input.addEventListener('ndp:show', ndpDomHandler);
  if (typeof $ !== 'undefined' && $.fn) {
    try { $(input).on('ndp:show', ndpDomHandler); } catch(e) {}
  }
  // also open on focus (keyboard navigation) and Enter/ArrowDown keys
  input.addEventListener('focus', handler);
  input.addEventListener('keydown', function(e){
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      handler(e);
    }
  });
  // also open when associated input-group-text icon clicked
  const nextEl = input.nextElementSibling;
  if (nextEl && nextEl.classList && nextEl.classList.contains('input-group-text')) {
    nextEl.addEventListener('click', handler);
  }

  input.dataset.ndpInitialized = 'true';
}

// Simple inline Nepali (BS) picker modal
function showSimpleNepaliPicker(input) {
  // create modal if not exists
  if (!document.getElementById('simple-nepali-picker')) {
    const modal = document.createElement('div');
    modal.id = 'simple-nepali-picker';
    // force important styles to try to override other CSS
    modal.style.setProperty('position', 'fixed', 'important');
    modal.style.setProperty('left', '0', 'important');
    modal.style.setProperty('top', '0', 'important');
    modal.style.setProperty('width', '100%', 'important');
    modal.style.setProperty('height', '100%', 'important');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('align-items', 'center', 'important');
    modal.style.setProperty('justify-content', 'center', 'important');
    modal.style.setProperty('background', 'rgba(0,0,0,0.55)', 'important');
    modal.style.setProperty('z-index', '2147483647', 'important');
    modal.style.setProperty('pointer-events', 'auto', 'important');
    modal.innerHTML = `
      <div id="_snp_box" style="background:#fff;padding:14px;border-radius:8px;min-width:320px;max-width:92%;box-shadow:0 12px 40px rgba(0,0,0,0.35);border:2px solid #0d6efd;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <h6 style="margin:0">नेपाली मिति छान्नुहोस्</h6>
          <div style="display:flex;gap:8px;align-items:center;">
            <button id="_snp_prev" class="btn btn-sm btn-light">‹</button>
            <select id="_snp_year" class="form-select" style="min-width:90px;"></select>
            <select id="_snp_month" class="form-select" style="min-width:110px;"></select>
            <button id="_snp_next" class="btn btn-sm btn-light">›</button>
          </div>
        </div>
        <div id="_snp_calendar" style="display:block;background:#fff;border-radius:6px;padding:8px;border:1px solid #eee;">
          <div id="_snp_weekdays" style="display:flex;gap:4px;margin-bottom:6px;font-size:12px;color:#333;"></div>
          <div id="_snp_days" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
        </div>
        <div style="text-align:right;display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">
          <button id="_snp_cancel" class="btn btn-outline">रद्द</button>
          <button id="_snp_ok" class="btn btn-primary">ठीक छ</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // populate months
    const nepaliMonths = ["बैशाख","जेठ","असार","साउन","भदौ","असोज","कार्तिक","मंसिर","पुष","माघ","फागुन","चैत"];
    const monthSelect = modal.querySelector('#_snp_month');
    nepaliMonths.forEach((m,i)=>{ const o=document.createElement('option'); o.value = i+1; o.textContent = m; monthSelect.appendChild(o);} );

    // year range around current nepali year (display in Devanagari digits)
    const currentBs = (getCurrentNepaliDate() || '').split('-')[0] || (new Date().getFullYear()+57);
    const yearSelect = modal.querySelector('#_snp_year');
    const cy = parseInt(currentBs) || (new Date().getFullYear()+57);
    for (let y = cy-5; y <= cy+5; y++) {
      const o=document.createElement('option'); o.value=y; o.textContent=_latinToDevnagari(String(y)); yearSelect.appendChild(o);
    }

    // set month to current Nepali month (if available) and render
    const currentBsParts = (getCurrentNepaliDate() || '').split('-');
    const currentBsMonth = parseInt(currentBsParts[1],10) || 1;
    monthSelect.value = currentBsMonth;
    yearSelect.value = cy;
    try { renderCalendar(cy, currentBsMonth); } catch(e) { /* ignore */ }

    // calendar helpers
    const daysContainer = modal.querySelector('#_snp_days');
    const weekdaysContainer = modal.querySelector('#_snp_weekdays');
    const nepaliWeekdays = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि'];
    weekdaysContainer.innerHTML = '';
    nepaliWeekdays.forEach(w=>{ const el = document.createElement('div'); el.style.flex = '1 0 calc(14.28% - 4px)'; el.style.textAlign='center'; el.textContent = w; weekdaysContainer.appendChild(el); });

    let _selectedDay = null;
    function clearSelection() {
      _selectedDay = null;
      const prev = daysContainer.querySelectorAll('.snp-day-selected');
      prev.forEach(p=>{ p.classList.remove('snp-day-selected'); p.style.background=''; p.style.color=''; });
    }

    function renderCalendar(bsYear, bsMonth) {
      daysContainer.innerHTML = '';
      // compute first weekday using BS->AD conversion if available
      let firstWeekday = 0; // 0 = Sunday
      try {
        if (typeof NepaliFunctions !== 'undefined' && typeof NepaliFunctions.BS2AD === 'function') {
          const adFirst = NepaliFunctions.BS2AD(bsYear, bsMonth, 1);
          if (adFirst && adFirst.indexOf('-')!==-1) {
            const p = adFirst.split('-').map(x=>Number(x));
            const dt = new Date(p[0], p[1]-1, p[2]);
            firstWeekday = dt.getDay();
          }
        }
      } catch(e){ console.warn('BS2AD failed',e); }

      // approximate month length
      const monthDays = [30,31,32,31,32,30,30,29,30,29,30,30];
      const total = monthDays[(bsMonth-1) % 12] || 30;

      // add empty slots
      for (let i=0;i<firstWeekday;i++){
        const el = document.createElement('div'); el.style.flex='1 0 calc(14.28% - 4px)'; el.style.height='34px'; daysContainer.appendChild(el);
      }
      for (let d=1; d<=total; d++){
        const el = document.createElement('div');
        el.className = 'snp-day';
        el.style.flex='1 0 calc(14.28% - 4px)';
        el.style.height='34px';
        el.style.lineHeight='34px';
        el.style.textAlign='center';
        el.style.borderRadius='4px';
        el.style.cursor='pointer';
        el.textContent = _latinToDevnagari(String(d));
        el.dataset.day = d;
        el.addEventListener('click', function(){
          clearSelection();
          el.classList.add('snp-day-selected');
          el.style.background = '#0d6efd'; el.style.color='#fff';
          _selectedDay = d;
          // Immediately set input to selected BS date in YYYY-MM-DD
          try {
            const ym = String(bsMonth).padStart(2,'0');
            const dv = `${bsYear}-${ym}-${String(d).padStart(2,'0')}`;
            input.value = dv;
            input.dispatchEvent(new Event('input',{bubbles:true}));
            input.dispatchEvent(new Event('change',{bubbles:true}));
          } catch(e) { console.warn('Could not set input on day click', e); }
        });
        // double-click quick accept: set value and close
        el.addEventListener('dblclick', function(){
          try {
            const ym = String(bsMonth).padStart(2,'0');
            const dv = `${bsYear}-${ym}-${String(d).padStart(2,'0')}`;
            input.value = dv;
            input.dispatchEvent(new Event('input',{bubbles:true}));
            input.dispatchEvent(new Event('change',{bubbles:true}));
            _closeSnp(modal);
          } catch(e) { console.warn('dblclick accept failed', e); }
        });
        daysContainer.appendChild(el);
      }
    }
    // expose helpers on modal element for later reuse
    try {
      modal._renderCalendar = renderCalendar;
      modal._clearSelection = clearSelection;
      modal._getSelectedDay = function(){ return _selectedDay; };
      modal._setSelectedDay = function(d){ _selectedDay = d; };
      modal._daysContainer = daysContainer;
      modal._yearSelect = yearSelect;
      modal._monthSelect = monthSelect;
    } catch(e) {}

    function _closeSnp(modalEl) {
      try { document.documentElement.style.removeProperty('overflow'); } catch(e){}
      modalEl.style.display = 'none';
    }
    modal.querySelector('#_snp_cancel').addEventListener('click', ()=>{ _closeSnp(modal); });
    modal.querySelector('#_snp_ok').addEventListener('click', ()=>{
      const y = yearSelect.value;
      const m = String(monthSelect.value).padStart(2,'0');
      const d = String(_selectedDay || 1).padStart(2,'0');
      const val = `${y}-${m}-${d}`;
      input.value = val;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
      _closeSnp(modal);
    });

    // update days when month/year change (approximate lengths)
    function updateDaysByMonth() {
      const y = parseInt(yearSelect.value,10) || cy;
      const m = parseInt(monthSelect.value,10) || 1;
      renderCalendar(y, m);
    }
    monthSelect.addEventListener('change', updateDaysByMonth);
    yearSelect.addEventListener('change', updateDaysByMonth);
    // prev/next buttons
    const prevBtn = modal.querySelector('#_snp_prev');
    const nextBtn = modal.querySelector('#_snp_next');
    if (prevBtn) prevBtn.addEventListener('click', ()=>{
      let m = parseInt(monthSelect.value,10) - 1;
      let y = parseInt(yearSelect.value,10);
      if (m < 1) { m = 12; y = y - 1; yearSelect.value = y; }
      monthSelect.value = m;
      renderCalendar(y, m);
    });
    if (nextBtn) nextBtn.addEventListener('click', ()=>{
      let m = parseInt(monthSelect.value,10) + 1;
      let y = parseInt(yearSelect.value,10);
      if (m > 12) { m = 1; y = y + 1; yearSelect.value = y; }
      monthSelect.value = m;
      renderCalendar(y, m);
    });
    // close when clicking outside the box
    modal.addEventListener('click', function(ev){
      if (ev.target && ev.target.id === 'simple-nepali-picker') {
        _closeSnp(modal);
      }
    });
    // allow ESC to close
    document.addEventListener('keydown', function escHandler(ev){
      if (ev.key === 'Escape') {
        modal.style.display = 'none';
      }
    });
  }

  const modalEl = document.getElementById('simple-nepali-picker');
  if (modalEl) {
    console.log('🧭 showSimpleNepaliPicker opening for', input.id);
    // set current value into modal selects if possible
    const v = normalizeNepaliDisplayToISO(input.value || input.getAttribute('value') || '') || '';
    const parts = v.split('-');
    const yearEl = modalEl.querySelector('#_snp_year');
    const monEl = modalEl.querySelector('#_snp_month');
    if (parts.length===3) {
      yearEl.value = parts[0];
      monEl.value = parseInt(parts[1]);
      // render calendar and mark selected day
      try {
        if (modalEl._renderCalendar) modalEl._renderCalendar(parseInt(parts[0],10), parseInt(parts[1],10));
        else if (typeof renderCalendar === 'function') renderCalendar(parseInt(parts[0],10), parseInt(parts[1],10));
        const sel = parseInt(parts[2],10) || 1;
        const dayBox = modalEl.querySelector('#_snp_days').querySelector(`[data-day="${sel}"]`);
        if (dayBox) {
          if (modalEl._clearSelection) modalEl._clearSelection();
          else { const prev = modalEl.querySelectorAll('.snp-day-selected'); prev.forEach(p=>p.classList.remove('snp-day-selected')); }
          dayBox.classList.add('snp-day-selected'); dayBox.style.background='#0d6efd'; dayBox.style.color='#fff';
          if (modalEl._setSelectedDay) modalEl._setSelectedDay(sel);
          else window._snp_selectedDay = sel;
        }
      } catch(e) { console.warn('Could not set initial selected day', e); }
    }
    // force visibility (in case CSS overrides)
    // attach to documentElement to avoid containment/clipping issues
    try {
      if (modalEl.parentNode !== document.documentElement) {
        document.documentElement.appendChild(modalEl);
      }
    } catch(e) { console.warn('Could not move modal to documentElement', e); }

    // prevent page scroll while modal open
    try { document.documentElement.style.setProperty('overflow','hidden','important'); } catch(e){}

    modalEl.style.setProperty('display','flex','important');
    modalEl.style.setProperty('visibility','visible','important');
    modalEl.style.setProperty('opacity','1','important');
    // ensure inner box is on top
    const box = modalEl.querySelector('#_snp_box');
    if (box) {
      box.style.setProperty('z-index','2147483648','important');
      box.style.setProperty('position','relative','important');
      // scale the calendar box to 60% per user request
      box.style.setProperty('transform','scale(0.60)','important');
      box.style.setProperty('transform-origin','center center','important');
    }

    // debug: log computed style and rects
    try {
      const comp = window.getComputedStyle(modalEl);
      const rect = modalEl.getBoundingClientRect();
      const boxRect = box ? box.getBoundingClientRect() : null;
      console.log('🧭 modal computed style', {display: comp.display, visibility: comp.visibility, opacity: comp.opacity, rect, boxRect});
    } catch(e) { console.warn(e); }

    // Extra visibility: scroll into view, focus and flash outline
    try {
      if (box && typeof box.scrollIntoView === 'function') {
        box.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      }
      if (box) {
        box.tabIndex = -1;
        box.focus({preventScroll:true});
        const prevOutline = box.style.outline || '';
        box.style.setProperty('outline', '4px solid rgba(13,110,253,0.18)', 'important');
        box.style.setProperty('transform', 'scale(1.01)', 'important');
        setTimeout(() => {
          box.style.removeProperty('outline');
          box.style.removeProperty('transform');
        }, 900);
      }
    } catch(e) { console.warn('visibility helpers failed', e); }

    // if after a short delay the modal isn't visible (0x0), fallback to prompt input
    requestAnimationFrame(()=>{
      setTimeout(()=>{
        try {
          const rect = modalEl.getBoundingClientRect();
          if (!rect || rect.width === 0 || rect.height === 0) {
            console.warn('⚠️ modal appears to be hidden by CSS; falling back to prompt for date');
            const manual = prompt('कृपया मिति YYYY-MM-DD मा लेख्नुहोस् (BS)', normalizeNepaliDisplayToISO(input.value) || '');
            if (manual) {
              input.value = manual;
              input.dispatchEvent(new Event('input',{bubbles:true}));
              input.dispatchEvent(new Event('change',{bubbles:true}));
            }
          }
        } catch (e) { console.error(e); }
      }, 120);
    });
  }
}

function loadFallbackLibrary() {
  if (window._fallbackLoading) return;
  window._fallbackLoading = true;
  console.log('📥 Loading local NepaliDatePicker fallback...');

  if (typeof $ === 'undefined') {
    console.warn('⚠️ jQuery not detected. Local fallback will provide conversion functions and a lightweight shim.');
  }
  // Load local vendor script (non-network) and CSS
  loadNepaliDatePickerScript();
}

function loadNepaliDatePickerScript() {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'vendor/nepali.datepicker.v2.2.min.css';
  document.head.appendChild(css);

    // Fix z-index for modals
    const style = document.createElement('style');
    style.innerHTML = '.nepali-calendar, #ndp-nepali-box { z-index: 99999 !important; }';
    document.head.appendChild(style);

    const script = document.createElement('script');
    script.src = 'vendor/nepali.datepicker.v2.2.min.js';
    script.onload = () => {
      console.log('✅ Local fallback NepaliDatePicker loaded');
      window._ndpRetries = 0;
      initializeDatepickers(); initializeNepaliDropdowns();
    };
    script.onerror = () => {
      console.error('❌ Failed to load local fallback library');
      console.error('❌ Fallback Nepali date picker failed to load. The date picker will not be available.');
    };
    document.head.appendChild(script);
}

function updateDateTime() {
  const now = new Date();
  const dateTimeElement = document.getElementById('currentDateTime');
  if (dateTimeElement) {
    dateTimeElement.textContent = now.toLocaleString('ne-NP', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}

function showToast(message, type = 'info') {
  if (typeof Toastify !== 'undefined') {
    Toastify({
      text: message,
      duration: 3000,
      gravity: "top",
      position: "right",
      style: {
        background: type === 'error' ? '#d32f2f' : 
                  type === 'success' ? '#2e7d32' : 
                  type === 'warning' ? '#ff8f00' : '#0288d1'
      },
      stopOnFocus: true
    }).showToast();
  } else {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 20px; right: 20px; padding: 12px 20px;
      background-color: ${type === 'error' ? '#d32f2f' : type === 'success' ? '#2e7d32' : 
                         type === 'warning' ? '#ff8f00' : '#0288d1'};
      color: white; border-radius: 4px; z-index: 9999;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

function showLoadingIndicator(show) {
  let loadingDiv = document.getElementById('loadingIndicator');
  if (show) {
    if (!loadingDiv) {
      loadingDiv = document.createElement('div');
      loadingDiv.id = 'loadingIndicator';
      loadingDiv.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background-color: rgba(0,0,0,0.5); display: flex;
        align-items: center; justify-content: center; z-index: 9999;
        flex-direction: column;
      `;
      
      const spinner = document.createElement('div');
      spinner.style.cssText = `
        width: 50px; height: 50px; border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db; border-radius: 50%;
        animation: spin 1s linear infinite;
      `;
      
      const text = document.createElement('div');
      text.style.cssText = `color: white; margin-top: 1rem; font-size: 1.2rem;`;
      text.textContent = 'डाटा लोड हुँदैछ...';
      
      loadingDiv.appendChild(spinner);
      loadingDiv.appendChild(text);
      document.body.appendChild(loadingDiv);

      // Safety Timeout: १५ सेकेन्डपछि लोडिङ आफैं हट्नेछ (यदि अड्कियो भने)
      setTimeout(() => {
        const currentLoader = document.getElementById('loadingIndicator');
        if (currentLoader) currentLoader.remove();
      }, 15000);
      
      if (!document.querySelector('style[data-spin]')) {
        const style = document.createElement('style');
        style.setAttribute('data-spin', 'true');
        style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
      }
    }
  } else if (loadingDiv) {
    loadingDiv.remove();
  }
}

function generateComplaintId() {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `NVC-${year}-${random}`;
}

// ==================== STYLESHEET & CHART LOADERS ====================
function ensureStylesheetsLoaded() {
  console.log('🎨 Checking stylesheets...');
  
  if (!document.querySelector('link[href*="bootstrap.min.css"]')) {
    const bootstrapCSS = document.createElement('link');
    bootstrapCSS.rel = 'stylesheet';
    bootstrapCSS.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css';
    document.head.appendChild(bootstrapCSS);
  }
  
  if (!document.querySelector('link[href*="font-awesome"]') && !document.querySelector('link[href*="fontawesome"]')) {
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
    document.head.appendChild(fontAwesome);
  }

}

function ensureChartJsLoaded() {
  return new Promise((resolve) => {
    if (typeof Chart !== 'undefined') {
      console.log('✅ Chart.js already loaded');
      resolve();
      return;
    }
    
    console.log('📥 Loading Chart.js...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
    script.onload = () => { console.log('✅ Chart.js loaded'); resolve(); };
    script.onerror = () => { console.error('❌ Failed to load Chart.js'); resolve(); };
    document.head.appendChild(script);
  });
}

function destroyAllCharts() {
  if (window.nvcCharts) {
    Object.keys(window.nvcCharts).forEach(key => {
      if (window.nvcCharts[key] && typeof window.nvcCharts[key].destroy === 'function') {
        try {
          window.nvcCharts[key].destroy();
        } catch (e) {}
        window.nvcCharts[key] = null;
      }
    });
  }
}


const initializeNepaliDatePickers = initializeDatepickers;

// ==================== GOOGLE SHEETS API FUNCTIONS ====================
async function getFromGoogleSheets(action, params = {}) {
  // Sheets disabled छ भने
  if (!GOOGLE_SHEETS_CONFIG.ENABLED) {
    console.log('ℹ️ Google Sheets disabled');
    return { success: false, data: [], message: 'Integration disabled' };
  }
  
  // API Key check
  if (!GOOGLE_SHEETS_CONFIG.API_KEY) {
    console.error('❌ API Key is missing');
    return { success: false, data: [], message: 'API Key is missing' };
  }
  
  // Web App URL check
  if (!GOOGLE_SHEETS_CONFIG.WEB_APP_URL || 
      GOOGLE_SHEETS_CONFIG.WEB_APP_URL.includes('script.google.com/macros/s/') === false) {
    console.error('❌ Invalid Web App URL');
    return { success: false, data: [], message: 'Invalid Web App URL' };
  }
  
  return new Promise((resolve) => {
    try {
      // ========== 1. URL बनाउने ==========
      let url = GOOGLE_SHEETS_CONFIG.WEB_APP_URL;
      
      // Add action
      url += `?action=${encodeURIComponent(action)}`;
      
      // 🔥 CRITICAL: API Key हरेक request मा पठाउनै पर्छ
      url += `&apiKey=${encodeURIComponent(GOOGLE_SHEETS_CONFIG.API_KEY)}`;
      
      // Add all parameters
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          url += `&${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`;
        }
      });
      
      // ========== 2. JSONP Callback ==========
      const callbackName = `jsonp_${action}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      url += `&callback=${callbackName}`;
      
      console.log(`📡 JSONP Request [${action}]`, url.substring(0, 200) + '...');
      
      let isResolved = false;
      let retryCount = 0;
      
      // ========== 3. Timeout ==========
      const timeout = setTimeout(() => {
        if (!isResolved) {
          console.error(`❌ JSONP Timeout [${action}] after ${GOOGLE_SHEETS_CONFIG.TIMEOUT}ms`);
          cleanup();
          
          // Retry logic
          if (retryCount < (GOOGLE_SHEETS_CONFIG.MAX_RETRIES || 3)) {
            retryCount++;
            console.log(`🔄 Retry ${retryCount}/${GOOGLE_SHEETS_CONFIG.MAX_RETRIES} for ${action}`);
            setTimeout(() => {
              // नयाँ callback name बनाउने
              const newCallback = `${callbackName}_retry${retryCount}`;
              url = url.replace(/&callback=[^&]+/, `&callback=${newCallback}`);
              
              window[newCallback] = window[callbackName];
              script.src = url;
              document.head.appendChild(script);
            }, GOOGLE_SHEETS_CONFIG.RETRY_DELAY * retryCount);
          } else {
            resolve({ 
              success: false, 
              data: [], 
              message: 'Timeout after retries',
              action: action 
            });
          }
        }
      }, GOOGLE_SHEETS_CONFIG.TIMEOUT || 30000);
      
      // ========== 4. Cleanup function ==========
      const cleanup = () => {
        clearTimeout(timeout);
        try {
          if (window[callbackName]) {
            delete window[callbackName];
          }
          if (script && script.parentNode) {
            script.parentNode.removeChild(script);
          }
        } catch (e) {}
      };
      
      // ========== 5. JSONP Callback Function ==========
      window[callbackName] = function(response) {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        
        console.log(`📨 JSONP Response [${action}] received`, response ? '✅' : '❌');
        
        // 🔥 CRITICAL: Apps Script बाट आउने विभिन्न response formats ह्यान्डल गर्ने
        let formattedResponse = response || { success: false, data: [] };
        
        // Case 1: सीधै array आयो भने
        if (Array.isArray(formattedResponse)) {
          formattedResponse = {
            success: true,
            data: formattedResponse,
            count: formattedResponse.length
          };
        }
        
        // Case 2: { data: [...] } आयो भने
        else if (formattedResponse.data && Array.isArray(formattedResponse.data) && 
                 formattedResponse.success === undefined) {
          formattedResponse.success = true;
        }
        
        // Case 3: success flag नै छैन भने
        else if (formattedResponse.success === undefined) {
          formattedResponse.success = !!formattedResponse.data || !!formattedResponse.id;
        }
        
        resolve(formattedResponse);
      };
      
      // ========== 6. Create Script Tag ==========
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      
      script.onerror = function(error) {
        if (isResolved) return;
        console.error(`❌ JSONP Network Error [${action}]:`, error);
        
        // Retry on network error
        if (retryCount < (GOOGLE_SHEETS_CONFIG.MAX_RETRIES || 3)) {
          retryCount++;
          console.log(`🔄 Retry ${retryCount}/${GOOGLE_SHEETS_CONFIG.MAX_RETRIES} for ${action} (network error)`);
          setTimeout(() => {
            const newScript = document.createElement('script');
            newScript.src = url;
            newScript.async = true;
            newScript.onerror = script.onerror;
            document.head.appendChild(newScript);
          }, GOOGLE_SHEETS_CONFIG.RETRY_DELAY * retryCount);
        } else {
          isResolved = true;
          cleanup();
          resolve({ 
            success: false, 
            data: [], 
            message: 'Network error after retries',
            action: action 
          });
        }
      };
      
      document.head.appendChild(script);
      
    } catch (error) {
      console.error(`❌ JSONP Exception [${action}]:`, error);
      resolve({ 
        success: false, 
        data: [], 
        message: error.toString(),
        action: action 
      });
    }
  });
}

async function postToGoogleSheets(action, data = {}) {
  // Sheets disabled छ भने local storage मा save गर्ने
  if (!GOOGLE_SHEETS_CONFIG.ENABLED) {
    console.log('ℹ️ Google Sheets disabled - saving locally');
    return { 
      success: true, 
      message: 'Data saved locally (Google Sheets disabled)',
      id: data.id || generateComplaintId(),
      local: true 
    };
  }
  
  return new Promise((resolve) => {
    try {
      // ========== 1. URL बनाउने ==========
      let url = GOOGLE_SHEETS_CONFIG.WEB_APP_URL;
      url += `?action=${encodeURIComponent(action)}`;
      url += `&apiKey=${encodeURIComponent(GOOGLE_SHEETS_CONFIG.API_KEY)}`;
      
      // URL मा fields append गर्ने
      // Enhance payload: for any date-like field, also send a Nepali (Devanagari) display variant.
      const enhanced = { ...data };
      try {
        Object.keys(data).forEach(k => {
          const v = data[k];
          if (v === undefined || v === null) return;
          const keyLower = String(k).toLowerCase();
          // if key looks like a date (contains 'date') then add Nepali variants
          if (keyLower.includes('date')) {
            try {
              const nep = _latinToDevnagari(String(v));
              // For save/update complaint actions, send the main key as Devanagari
              // so the sheet stores Nepali text; also include an ISO copy usable by backend.
              if (action === 'saveComplaint' || action === 'updateComplaint' || action === 'saveHelloSarkarComplaint') {
                enhanced[`${k}Iso`] = String(v);
                enhanced[k] = nep;
              } else {
                // default: add a Nepali variant alongside existing value
                enhanced[`${k}Nepali`] = nep;
              }
            } catch (e) { /* ignore */ }
          }
        });
      } catch (e) {
        console.warn('Could not enhance payload with Nepali dates:', e);
      }

      // This is more robust than manually listing fields.
      // It also sends empty strings, which is correct for clearing a field's value.
      Object.keys(enhanced).forEach(key => {
        const value = enhanced[key];
        if (value !== undefined && value !== null) {
          url += `&${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
        }
      });
      
      // ========== 2. JSONP Callback ==========
      const callbackName = `post_${action}_${Date.now()}`;
      url += `&callback=${callbackName}`;
      
      console.log(`📤 JSONP POST [${action}]`, Object.keys(data).join(', '));
      // Debug: log final URL so we can confirm Nepali date params are included
      try { console.log('📤 JSONP URL:', url); } catch (e) { /* ignore */ }
      
      let isResolved = false;
      
      // ========== 3. Timeout ==========
      const timeout = setTimeout(() => {
        if (!isResolved) {
          console.warn(`⚠️ JSONP POST timeout [${action}] - saving locally`);
          isResolved = true;
          delete window[callbackName];
          if (script.parentNode) script.parentNode.removeChild(script);
          
          // Timeout भयो, data पुगेको हुन सक्छ वा नहुन सक्छ।
          // यसलाई local मा मात्र सेभ भएको मान्ने ताकि पछि sync गर्न सकियोस्।
          resolve({ 
            success: false, 
            message: 'Request timed out. Saved locally for later sync.',
            id: data.id,
            local: true,
            timeout: true 
          });
        }
      }, GOOGLE_SHEETS_CONFIG.TIMEOUT || 30000);
      
      // ========== 4. JSONP Callback ==========
      window[callbackName] = function(response) {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timeout);
        
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
        
        console.log(`📨 JSONP POST Response [${action}]`, response ? '✅' : '⚠️');
        
        // Response format normalize गर्ने
        // FIX: Never assume success. Default to failure if response is falsy.
        let formattedResponse = response || { success: false, message: "No response from server", id: data.id, local: true };
        
        // If response is an object but lacks a 'success' property, it's an ambiguous situation.
        // To be safe, we should treat it as a failure unless the server explicitly returns success: true.
        if (formattedResponse.success === undefined) {
          formattedResponse.success = false; // Default to false
          if (!formattedResponse.message) {
            formattedResponse.message = "Incomplete or invalid response from server.";
          }
        }
        
        resolve(formattedResponse);
      };
      
      // ========== 5. Create Script Tag ==========
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      
      script.onerror = function(error) {
        if (isResolved) return;
        console.error(`❌ JSONP POST Network Error [${action}]:`, error);
        
        isResolved = true;
        clearTimeout(timeout);
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
        
        // Network error भए पनि local मा save गर्ने
        resolve({ 
          success: false, 
          message: 'Network error - saved locally',
          id: data.id,
          local: true,
          error: error.toString()
        });
      };
      
      document.head.appendChild(script);
      
    } catch (error) {
      console.error(`❌ JSONP POST Exception [${action}]:`, error);
      resolve({ 
        success: false, 
        message: error.message,
        id: data.id,
        local: true 
      });
    }
  });
}

async function loadDataFromGoogleSheets(forceReload = false) {
  if (window._isLoadingData && !forceReload) {
    console.log('⚠️ Already loading data, skipping...');
    return window._lastLoadResult || false;
  }
  
  if (!GOOGLE_SHEETS_CONFIG.ENABLED) {
    console.log('ℹ️ Google Sheets disabled');
    return false;
  }
  
  if (!GOOGLE_SHEETS_CONFIG.WEB_APP_URL || 
      !GOOGLE_SHEETS_CONFIG.WEB_APP_URL.includes('script.google.com/macros/s/')) {
    console.error('❌ Invalid Web App URL');
    showToast('❌ Google Sheets URL सही छैन', 'error');
    return false;
  }
  
  window._isLoadingData = true;
  showLoadingIndicator(true);

  try {
    // ===== STEP 1: LOAD COMPLAINTS (This also tests the connection) =====
    console.log('📡 Loading complaints from Google Sheets...');
    const response = await getFromGoogleSheets('getComplaints');
    
    // Check if the request itself failed (timeout, network error, etc.)
    if (!response || response.success === false) {
      console.error('❌ Failed to load complaints from Google Sheets.', response?.message || 'No response.');
      showToast('❌ Google Sheets बाट डाटा लोड हुन सकेन।', 'error');
      // The 'finally' block will hide the loader. The function will proceed to the local storage fallback.
    }
        
    // ===== STEP 2: EXTRACT DATA FROM RESPONSE =====
    let complaintsData = [];
    
    if (response && response.success) {
      if (Array.isArray(response.data)) {
        complaintsData = response.data;
        console.log(`✅ Loaded ${complaintsData.length} complaints from response.data`);
      } else {
        console.warn('⚠️ Response success but data is not an array.');
      }
    } else {
        console.warn('⚠️ Google Sheets response was not successful or missing.');
    }

    // ===== STEP 3: FORMAT COMPLAINTS =====
    const formattedComplaints = [];
    
    for (const item of complaintsData) {
      try {
        const formatted = formatComplaintFromSheet(item);
        if (formatted && formatted.id) {
          formatted.syncedToSheets = true;
          formattedComplaints.push(formatted);
        } else if (formatted) {
          console.warn('⚠️ Formatted complaint missing ID:', formatted);
        }
      } catch (e) {
        console.error('❌ Error formatting complaint:', e);
      }
    }
    
    // ===== STEP 4: UPDATE STATE =====
    if (formattedComplaints.length > 0) {
      const currentUnsynced = (state.complaints || []).filter(c => !c.syncedToSheets);
      const sheetIds = new Set(formattedComplaints.map(c => String(c.id)));
      const keptUnsynced = currentUnsynced.filter(c => !sheetIds.has(String(c.id)));
        // Normalize complaint dates to BS ISO (YYYY-MM-DD) so charts use consistent Nepali dates
        try {
          formattedComplaints.forEach(c => {
            try {
              c.date = ensureBSDate(c.date || '');
              c.entryDate = ensureBSDate(c.entryDate || c.createdAt || '');
            } catch (e) { /* ignore per-row errors */ }
          });
        } catch (e) { console.warn('Date normalization failed:', e); }

        state.complaints = [...keptUnsynced, ...formattedComplaints];
      
      console.log(`✅ State updated: ${state.complaints.length} complaints`);
      
      try {
        localStorage.setItem('nvc_complaints_backup', JSON.stringify(state.complaints));
        localStorage.setItem('nvc_complaints_backup_time', new Date().toISOString());
        console.log('✅ Backed up to localStorage');
      } catch (e) {
        console.warn('⚠️ Could not save to localStorage:', e);
      }
      
      showToast(`✅ ${state.complaints.length} उजुरीहरू लोड भयो`, 'success');
      
      // ===== STEP 5: UPDATE UI =====
      if (state.currentPage === 'dashboardPage' || state.currentPage === 'dashboard') {
        // ===== STEP 5: UPDATE UI & RUN POST-LOAD TASKS =====
        if (typeof monitorHotspotAlerts === 'function') {
          monitorHotspotAlerts();
        }

        if (typeof updateStats === 'function') updateStats();
        setTimeout(() => {
          if (typeof destroyAllCharts === 'function') destroyAllCharts();
          if (typeof initializeDashboardCharts === 'function') initializeDashboardCharts();
        }, 300);
      }
      
      if (state.currentView === 'complaints' || state.currentView === 'all_complaints') {
        showComplaintsView();
      }
      
      if (typeof updateSyncButton === 'function') updateSyncButton();

      window._lastLoadResult = true;
      return true;
      
    } else {
      console.warn('⚠️ No valid complaints data found in response. Relying on localStorage.');
      const localStorageLoaded = (state.complaints && state.complaints.length > 0);
      if (localStorageLoaded) {
          showToast(`📦 LocalStorage बाट ${state.complaints.length} उजुरीहरू प्रयोग गरिँदैछ।`, 'info');
      }
      window._lastLoadResult = localStorageLoaded;
      return localStorageLoaded;
    }
    
  } catch (error) {
    console.error('❌ Fatal error loading from Google Sheets:', error);
    showToast('❌ डाटा लोड गर्दा त्रुटि', 'error');
    const localStorageLoaded = (state.complaints && state.complaints.length > 0);
    window._lastLoadResult = localStorageLoaded;
    return localStorageLoaded;
  } finally {
    window._isLoadingData = false;
    showLoadingIndicator(false);
  }
}

// ==================== GET DATA FROM GOOGLE SHEETS ====================
async function getData(dataType = 'complaints', params = {}) {
  console.log(`📡 getData() called for: ${dataType}`);
  
  switch(dataType) {
    case 'complaints':
      return await getFromGoogleSheets('getComplaints', params);
    case 'projects':
      return await getFromGoogleSheets('getProjects', params);
    case 'employee_monitoring':
      return await getFromGoogleSheets('getEmployeeMonitoring', params);
    case 'citizen_charter':
      return await getFromGoogleSheets('getCitizenCharter', params);
    default:
      return { success: false, data: [], message: 'Invalid data type' };
  }
}

async function saveData(dataType, data) {
  console.log(`📝 saveData() called for: ${dataType}`);
  
  let action = '';
  
  switch(dataType) {
    case 'complaint':
      action = 'saveComplaint';
      break;
    case 'project':
      action = 'saveProject';
      break;
    case 'employee_monitoring':
      action = 'saveEmployeeMonitoring';
      break;
    case 'citizen_charter':
      action = 'saveCitizenCharter';
      break;
    default:
      return { success: false, message: 'Invalid data type' };
  }
  
  return await postToGoogleSheets(action, data);
}

async function submitForm(formType, formData) {
  console.log(`📋 submitForm() called for: ${formType}`);
  
  showLoadingIndicator(true);
  
  let result;
  
  switch(formType) {
    case 'complaint':
      result = await saveNewComplaint(formData);
      break;
    case 'project':
      result = await saveTechnicalProject(formData);
      break;
    case 'employee_monitoring':
      result = await saveEmployeeMonitoring(formData);
      break;
    case 'citizen_charter':
      result = await saveCitizenCharter(formData);
      break;
    default:
      showToast('Invalid form type', 'error');
      showLoadingIndicator(false);
      return false;
  }
  
  showLoadingIndicator(false);
  return result;
}

async function refreshData() {
  console.log('🔄 refreshData() called');
  
  if (!state.currentUser) {
    showToast('कृपया पहिला लगइन गर्नुहोस्', 'warning');
    return false;
  }
  
  showLoadingIndicator(true);
  showToast('🔄 डाटा रिफ्रेस हुँदैछ...', 'info');
  
  try {
    // Clear loading flag
    window._isLoadingData = false;
    
    // Force reload from Google Sheets
    const loaded = await loadDataFromGoogleSheets(true);
    
    if (loaded) {
      showToast(`✅ ${state.complaints.length} उजुरीहरू लोड भयो`, 'success');
      
      // Update current view based on state.currentView
      if (state.currentView === 'complaints' || state.currentView === 'all_complaints') {
        showComplaintsView();
      } else if (state.currentView === 'dashboard' || state.currentPage === 'dashboardPage') {
        if (typeof updateStats === 'function') updateStats();
        if (typeof initializeDashboardCharts === 'function') {
          setTimeout(() => {
            destroyAllCharts();
            initializeDashboardCharts();
          }, 300);
        }
      } else if (state.currentView === 'technical_projects') {
        showTechnicalProjectsView();
      } else if (state.currentView === 'employee_monitoring') {
        showEmployeeMonitoringView();
      } else if (state.currentView === 'citizen_charter') {
        showCitizenCharterView();
      }
      
      return true;
    } else {
      showToast('⚠️ डाटा लोड हुन सकेन', 'warning');
      return false;
    }
  } catch (error) {
    console.error('❌ Refresh error:', error);
    showToast('❌ रिफ्रेस गर्दा त्रुटि', 'error');
    return false;
  } finally {
    showLoadingIndicator(false);
  }
}

function addRefreshButton() {
  const container = document.getElementById('sheetActions');
  if (!container) return;
  
  if (!document.getElementById('refreshDataBtn')) {
    const refreshBtn = document.createElement('button');
    refreshBtn.id = 'refreshDataBtn';
    refreshBtn.className = 'btn btn-sm btn-outline-primary';
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
    refreshBtn.addEventListener('click', refreshData);
    refreshBtn.title = 'Google Sheets बाट डाटा रिफ्रेस गर्नुहोस्';
    container.appendChild(refreshBtn);
  }
}

async function testGoogleSheetsConnection() {
  console.log('🧪 Testing Google Sheets connection...');
  showToast('🔄 Google Sheets connection testing...', 'info');
  
  // Web App URL check
  if (!GOOGLE_SHEETS_CONFIG.WEB_APP_URL || 
      GOOGLE_SHEETS_CONFIG.WEB_APP_URL.includes('script.google.com/macros/s/') === false) {
    const errorMsg = '❌ Web App URL सही छैन। कृपया Apps Script बाट नयाँ Deployment गर्नुहोस्।';
    console.error(errorMsg);
    showToast(errorMsg, 'error');
    return false;
  }
  
  try {
    const response = await getFromGoogleSheets('test');
    
    if (response && response.success === true) {
      console.log('✅ Google Sheets connection successful!', response);
      showToast('✅ Google Sheets connection successful!', 'success');
      
      // Spreadsheet access status देखाउने
      if (response.spreadsheetAccess) {
        console.log('📊 Spreadsheet access:', response.spreadsheetAccess);
        if (response.spreadsheetAccess.includes('inaccessible')) {
          showToast('⚠️ Spreadsheet access issue: ' + response.spreadsheetAccess, 'warning');
        }
      }
      
      return true;
    } else {
      console.error('❌ Google Sheets connection failed:', response);
      showToast('❌ Connection failed: ' + (response?.message || 'Unknown error'), 'error');
      return false;
    }
  } catch (error) {
    console.error('❌ Connection test error:', error);
    showToast('❌ Connection error: ' + error.message, 'error');
    return false;
  }
}

function formatComplaintFromSheet(sheetData) {
  if (!sheetData) return null;
  
  // Helper to get value from multiple possible keys
  const getValue = (...keys) => {
    // 1. Try exact match first (fast)
    for (const key of keys) {
      if (sheetData[key] !== undefined && sheetData[key] !== null && sheetData[key] !== '') {
        return sheetData[key];
      }
    }
    
    // 2. Try case-insensitive match (slower but safer)
    const dataKeys = Object.keys(sheetData);
    for (const key of keys) {
      const lowerKey = key.toLowerCase();
      const foundKey = dataKeys.find(k => k.toLowerCase() === lowerKey);
      if (foundKey && sheetData[foundKey] !== undefined && sheetData[foundKey] !== null && sheetData[foundKey] !== '') {
        return sheetData[foundKey];
      }
    }
    return ''; // Return empty string if no key is found
  };

  try {
    const complaint = {
      id: String(getValue('id', 'complaintId', 'उजुरी दर्ता नं', 'शिकायत नं', 'Complaint ID') || ''),
      date: String(getValue('date', 'दर्ता मिति', 'मिति')),
      complainant: String(getValue('complainant', 'complainantName', 'उजुरीकर्ताको नाम', 'उजुरकर्ता')),
      accused: String(getValue('accused', 'accusedName', 'विपक्षी')),
      description: String(getValue('description', 'complaintDescription', 'उजुरीको संक्षिप्त विवरण', 'विवरण')),
      shakha: String(getValue('shakha', 'shakhaName', 'assignedShakha', 'सम्बन्धित शाखा', 'शाखा', 'Branch', 'Entry Branch')),
      mahashakha: String(getValue('mahashakha', 'mahashakhaName', 'महाशाखा')),
      status: String(getValue('status', 'स्थिति') || 'pending'),
      entryDate: String(getValue('entryDate', 'Entry Date', 'createdAt', 'सिर्जना मिति')),
      // Corrected Decision Fields
      // Merges old 'प्रस्तावित निर्णय' into 'समितिको निर्णय'
      committeeDecision: String(getValue('committeeDecision', 'proposedDecision', 'समितिको निर्णय', 'प्रस्तावित निर्णय')),
      // Free-text final decision
      decision: String(getValue('decision', 'अन्तिम निर्णय', 'निर्णय')),
      // Dropdown for final decision type
      finalDecision: String(getValue('finalDecision', 'अन्तिम निर्णयको प्रकार')),
      remarks: String(getValue('remarks', 'कैफियत')),
      source: String(getValue('source', 'उजुरीको माध्यम') || 'internal'),
      correspondenceDate: String(getValue('correspondenceDate', 'पत्राचार मिति')),
      investigationDetails: String(getValue('investigationDetails', 'छानबिनको विवरण')),
      assignedShakha: String(getValue('assignedShakha', 'shakha', 'shakhaName', 'सम्बन्धित शाखा', 'शाखा')),
      assignedDate: String(getValue('assignedDate', 'शाखामा पठाएको मिति')),
      // preserve Nepali display if sheet contains it
      dateNepali: String(getValue('dateNepali', 'nepaliDate', 'दर्ता मिति नेपाली', 'नेपाली मिति')) || '',
      instructions: String(getValue('instructions', 'निर्देशन')),
      createdBy: String(getValue('createdBy', 'सिर्जना गर्ने')),
      createdAt: String(getValue('createdAt', 'सिर्जना मिति', 'entryDate', 'Entry Date')),
      updatedBy: String(getValue('updatedBy', 'अपडेट गर्ने')),
      updatedAt: String(getValue('updatedAt', 'अपडेट मिति')),
      syncedToSheets: true,
      province: String(getValue('province', 'प्रदेश')),
      district: String(getValue('district', 'जिल्ला')),
      location: String(getValue('location', 'स्थानीय तह')),
      ward: String(getValue('ward', 'वडा')),
    };
    
    // यदि ID छैन भने डाटा नलिने (खाली रो हुन सक्छ)
    if (!complaint.id) return null;
    
    return complaint;
    
  } catch (error) {
    console.error('❌ Error formatting complaint:', error);
    return null;
  }
}

function checkRequiredElements() {
  console.log('🔍 Checking required DOM elements...');
  
  const requiredElements = [
    'contentArea',
    'pageTitle',
    'complaintModal',
    'shakhaModal',
    'loginPage',
    'mainPage',
    'dashboardPage'
  ];
  
  const missing = [];
  
  requiredElements.forEach(id => {
    if (!document.getElementById(id)) {
      missing.push(id);
      console.warn(`⚠️ Missing element: #${id}`);
    }
  });
  
  if (missing.length === 0) {
    console.log('✅ All required DOM elements found');
  } else {
    console.warn(`⚠️ Missing ${missing.length} elements:`, missing);
  }
  
  return missing.length === 0;
}

function loadFromLocalStorage() {
  try {
    const savedComplaints = localStorage.getItem('nvc_complaints_backup');
    if (savedComplaints) {
      const complaints = JSON.parse(savedComplaints);
      if (Array.isArray(complaints) && complaints.length > 0) {
        state.complaints = complaints;
        console.log(`✅ Loaded ${state.complaints.length} complaints from localStorage`);
        showToast(`📦 LocalStorage बाट ${state.complaints.length} उजुरीहरू लोड भयो`, 'info');
        return true;
      }
    }
  } catch (e) {
    console.error('❌ Error loading from localStorage:', e);
  }
  if (!state.complaints) state.complaints = [];
  return false;
}

function backupToLocalStorage() {
  try {
    localStorage.setItem('nvc_complaints_backup', JSON.stringify(state.complaints));
  } catch (e) {
    console.warn('⚠️ Could not save to localStorage:', e);
  }
}

async function syncAllDataToGoogleSheets() {
  // Unsynced complaints फेला पार्ने
  const unsyncedComplaints = state.complaints.filter(c => !c.syncedToSheets);
  
  if (unsyncedComplaints.length === 0) {
    showToast('✅ सबै डाटा पहिले नै sync भइसकेको छ', 'success');
    return { success: true, synced: 0, failed: 0 };
  }
  
  showLoadingIndicator(true);
  showToast(`🔄 ${unsyncedComplaints.length} वटा उजुरी sync गर्दै...`, 'info');
  
  let success = 0;
  let failed = 0;
  
  for (const complaint of unsyncedComplaints) {
    try {
      console.log(`🔄 Syncing complaint: ${complaint.id}`);
      
      // Save data तयार पार्ने
      const saveData = {
        id: complaint.id,
        complaintId: complaint.id,
        date: complaint.date,
        complainant: complaint.complainant,
        complainantName: complaint.complainant,
        accused: complaint.accused || '',
        accusedName: complaint.accused || '',
        description: complaint.description,
        complaintDescription: complaint.description,
        proposedDecision: complaint.proposedDecision || '',
        remarks: complaint.remarks || '',
        status: complaint.status || 'pending',
        shakha: complaint.shakha || '',
        shakhaName: complaint.shakha || '',
        mahashakha: complaint.mahashakha || '',
        mahashakhaName: complaint.mahashakha || '',
        source: complaint.source || 'internal',
        createdBy: complaint.createdBy || '',
        decision: complaint.decision || '',
        finalDecision: complaint.finalDecision || ''
      };
      
      const result = await postToGoogleSheets('saveComplaint', saveData);
      
      if (result && result.success === true) {
        complaint.syncedToSheets = true;
        success++;
        console.log(`✅ Synced: ${complaint.id}`);
      } else {
        failed++;
        console.warn(`⚠️ Failed: ${complaint.id}`, result);
      }
    } catch (e) {
      failed++;
      console.error(`❌ Error syncing ${complaint.id}:`, e);
    }
    
    // Rate limiting को लागि delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Backup to localStorage
  try {
    backupToLocalStorage();
  } catch (e) {}
  
  showLoadingIndicator(false);
  
  if (success > 0) {
    showToast(`✅ ${success} सफल, ❌ ${failed} असफल`, success > 0 ? 'success' : 'warning');
  } else {
    showToast(`❌ कुनै पनि sync हुन सकेन`, 'error');
  }
  
  updateSyncButton();
  
  return { success, failed };
}

function updateSyncButton() {
  const syncBtn = document.getElementById('syncSheetsBtn');
  if (!syncBtn) return;
  
  // Unsynced complaints count
  const unsyncedCount = state.complaints ? 
    state.complaints.filter(c => !c.syncedToSheets).length : 0;
  
  syncBtn.innerHTML = `<i class="fas fa-sync"></i> Sync (${unsyncedCount})`;
  syncBtn.classList.remove('btn-warning', 'btn-success', 'btn-secondary');
  
  if (unsyncedCount === 0) {
    syncBtn.classList.add('btn-success');
    syncBtn.title = 'सबै डाटा sync भइसकेको छ';
  } else {
    syncBtn.classList.add('btn-warning');
    syncBtn.title = `${unsyncedCount} वटा उजुरी sync गर्न बाँकी`;
  }
  
  // Disable/enable button
  syncBtn.disabled = false;
}

async function saveNewComplaint() {
  console.log('📝 saveNewComplaint() called');
  
  // ========== 1. FORM DATA COLLECT ==========
  const complaintId = document.getElementById('complaintId')?.value || '';
  const complaintDate = document.getElementById('complaintDate')?.value;
  const complainantName = document.getElementById('complainantName')?.value;
  const accusedName = document.getElementById('accusedName')?.value;
  const complaintDescription = document.getElementById('complaintDescription')?.value;
  const committeeDecision = document.getElementById('committeeDecision')?.value;
  const complaintRemarks = document.getElementById('complaintRemarks')?.value;
  const complaintStatus = document.getElementById('complaintStatus')?.value || 'pending';
  
  // ========== 2. VALIDATION ==========
  if (!complaintDate) { 
    showToast('कृपया दर्ता मिति भर्नुहोस्', 'warning'); 
    return; 
  }
  if (!complainantName) { 
    showToast('कृपया उजुरकर्ताको नाम भर्नुहोस्', 'warning'); 
    return; 
  }
  if (!complaintDescription) { 
    showToast('कृपया उजुरीको विवरण भर्नुहोस्', 'warning'); 
    return; 
  }
  if (!state.currentUser) { 
    showToast('कृपया पहिला लगइन गर्नुहोस्', 'error'); 
    return; 
  }
  
  showLoadingIndicator(true);
  showToast('🔄 उजुरी सेभ गर्दै...', 'info');
  
  // ========== 3. PREPARE DATA ==========
  const finalId = complaintId || generateComplaintId();
  
  // शाखा र महाशाखाको नाम (user बाट)
  let shakhaName = '';
  let mahashakhaName = '';
  let shakhaToSave = '';

  if (state.currentUser) {
    if (state.currentUser.shakha) {
      // Filtering reliably requires saving the code, not the full name.
      shakhaToSave = state.currentUser.shakha;
      shakhaName = SHAKHA[shakhaToSave] || shakhaToSave;
    }
    if (state.currentUser.mahashakha) {
      mahashakhaName = MAHASHAKHA[state.currentUser.mahashakha] || state.currentUser.mahashakha;
    }
  }
  
  // If Admin is saving, check if a specific shakha was selected from dropdown
  if (state.currentUser.role === 'admin') {
      const selectedShakhaName = document.getElementById('complaintShakha')?.value;
      if (selectedShakhaName) {
          // Use the name directly for consistency
          shakhaToSave = selectedShakhaName;
      }
  }
  
  // Apps Script ले बुझ्ने सही field names प्रयोग गर्ने
  // FIX: Use English keys that match the HEADERS in code.gs for reliability.
  // This avoids potential issues with the PARAM_MAP on the backend.
  const complaintData = {
    id: finalId,
    date: complaintDate,
    // preserve Nepali display (Devanagari digits) for Sheets display
    dateNepali: _latinToDevnagari(String(normalizeNepaliDisplayToISO(complaintDate) || complaintDate)),
    complainant: complainantName,
    accused: accusedName || '',
    description: complaintDescription,
    committeeDecision: committeeDecision || '',
    remarks: complaintRemarks || '',
    status: complaintStatus,
    shakha: shakhaToSave,
    shakhaName: shakhaName,
    mahashakha: mahashakhaName,
    source: 'internal',
    createdBy: state.currentUser.name || state.currentUser.id || 'Unknown',
    createdAt: new Date().toISOString(),
    entryDate: new Date().toISOString().slice(0, 10),
    'Entry Date': new Date().toISOString().slice(0, 10),
    'Branch': shakhaName || shakhaToSave, // Main key for sheet
    
    'Entry Branch': shakhaName || shakhaToSave,
    province: document.getElementById('complaintProvince')?.value || '',
    district: document.getElementById('complaintDistrict')?.value || '',
    location: document.getElementById('complaintLocation')?.value || ''
  };
  
  console.log('📦 Complaint data prepared:', Object.keys(complaintData).join(', '));
  
  // ========== 4. SAVE TO GOOGLE SHEETS ==========
  const result = await postToGoogleSheets('saveComplaint', complaintData);
  
  console.log('📨 Save result:', result);
  
  // ========== 5. CREATE LOCAL COMPLAINT OBJECT ==========
  const newComplaint = {
    id: finalId,
    date: complaintDate,
    complainant: complainantName,
    accused: accusedName || '',
    description: complaintDescription,
    committeeDecision: committeeDecision || '',
    remarks: complaintRemarks || '',
    status: complaintStatus,
    shakha: shakhaToSave,
    mahashakha: mahashakhaName,
    createdBy: state.currentUser?.name || '',
    createdAt: new Date().toISOString(),
    entryDate: new Date().toISOString().slice(0, 10),
    syncedToSheets: result?.success === true,
    source: 'internal'
  };
  
  // ========== 6. UPDATE STATE ==========
  state.complaints.unshift(newComplaint);
  
  // ========== 7. BACKUP TO LOCALSTORAGE ==========
  try {
    backupToLocalStorage();
  } catch (e) {}
  
  showLoadingIndicator(false);
  
  // ========== 8. SHOW MESSAGE ==========
  if (result?.success === true) {
    showToast('✅ उजुरी Google Sheet मा सेभ भयो', 'success');
  } else if (result?.local === true) {
    showToast('⚠️ उजुरी Local मा मात्र सेभ भयो', 'warning');
  } else {
    showToast('⚠️ उजुरी Local मा सेभ भयो (Sync पछि हुनेछ)', 'info');
  }
  
  // ========== 9. RESET FORM ==========
  const form = document.querySelector('form');
  if (form) form.reset();
  
  const dateField = document.getElementById('complaintDate');
  if (dateField) dateField.value = getCurrentNepaliDate();
  
  // ========== 10. UPDATE UI ==========
  updateSyncButton();
  
  // Show complaints view after 1.5 seconds
  setTimeout(() => { 
    showComplaintsView(); 
  }, 1500);
}

async function saveEditedComplaint(complaintId) {
  const index = state.complaints.findIndex(c => String(c.id) === String(complaintId));
  if (index !== -1) {
    showLoadingIndicator(true);

    // Data from the form generated by editComplaint()
    const updatePayload = {
      id: complaintId,
      complaintId: complaintId,
      'उजुरी दर्ता नं': complaintId,
      'दर्ता मिति': document.getElementById('editDate').value,
      'दर्ता मिति नेपाली': _latinToDevnagari(String(normalizeNepaliDisplayToISO(document.getElementById('editDate').value) || document.getElementById('editDate').value)),
      'उजुरीकर्ताको नाम': document.getElementById('editComplainant').value,
      'विपक्षी': document.getElementById('editAccused').value,
      'उजुरीको संक्षिप्त विवरण': document.getElementById('editDescription').value,
      'समितिको निर्णय': document.getElementById('editCommitteeDecision').value,
      'अन्तिम निर्णय': document.getElementById('editDecision').value,
      'अन्तिम निर्णयको प्रकार': document.getElementById('editFinalDecision').value,
      'कैफियत': document.getElementById('editRemarks').value,
      'स्थिति': document.getElementById('editStatus').value,
      'अपडेट गर्ने': state.currentUser.name,
      // English keys for compatibility
      description: document.getElementById('editDescription').value,
      remarks: document.getElementById('editRemarks').value,
      decision: document.getElementById('editDecision').value,
      status: document.getElementById('editStatus').value
    };

    // Send to Google Sheets
    const result = await postToGoogleSheets('updateComplaint', updatePayload);

    // Update local state
    state.complaints[index] = {
      ...state.complaints[index],
      date: updatePayload['दर्ता मिति'],
      complainant: updatePayload['उजुरीकर्ताको नाम'],
      accused: updatePayload['विपक्षी'],
      description: updatePayload['उजुरीको संक्षिप्त विवरण'],
      committeeDecision: updatePayload['समितिको निर्णय'],
      decision: updatePayload['अन्तिम निर्णय'],
      finalDecision: updatePayload['अन्तिम निर्णयको प्रकार'],
      remarks: updatePayload['कैफियत'],
      status: updatePayload['स्थिति'],
      updatedAt: new Date().toISOString(),
      updatedBy: state.currentUser?.name,
      syncedToSheets: result?.success === true
    };

    backupToLocalStorage();
    showLoadingIndicator(false);

    if (result?.success) {
      showToast('✅ उजुरी सफलतापूर्वक अपडेट गरियो', 'success');
    } else {
      showToast('⚠️ उजुरी Local मा मात्र अपडेट भयो', 'warning');
    }

    closeModal();
    showComplaintsView();
    updateSyncButton();
  }
}

function openModal(title, content) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = content;
  document.getElementById('complaintModal').classList.remove('hidden');
  
  // मोडल खुलिसकेपछि Datepicker initialize गर्ने
  setTimeout(() => {
    initializeDatepickers(); initializeNepaliDropdowns();
  }, 200);
}

async function saveComplaintToGoogleSheets(complaintData) {
  if (!GOOGLE_SHEETS_CONFIG.ENABLED || state.useLocalData) {
    const newComplaint = {
      id: complaintData.id || generateComplaintId(),
      date: complaintData.date || getCurrentNepaliDate(),
      complainant: complaintData.complainant || '',
      accused: complaintData.accused || '',
      description: complaintData.description || '',
      shakha: complaintData.shakha || state.currentUser?.shakha || '',
      mahashakha: complaintData.mahashakha || '',
      status: complaintData.status || 'pending',
      proposedDecision: complaintData.proposedDecision || '',
      decision: complaintData.decision || '',
      remarks: complaintData.remarks || '',
      source: complaintData.source || 'internal',
      createdBy: state.currentUser?.name || '',
      createdAt: new Date().toISOString()
    };
    state.complaints.unshift(newComplaint);
    return { success: true, message: 'Complaint saved locally', id: newComplaint.id };
  }
  
  try {
    const result = await postToGoogleSheets('saveComplaint', {
      id: complaintData.id, date: complaintData.date,
      complainant: complaintData.complainant, accused: complaintData.accused,
      description: complaintData.description,
      shakha: complaintData.shakha || state.currentUser?.shakha,
      mahashakha: complaintData.mahashakha,
      status: complaintData.status || 'pending',
      proposedDecision: complaintData.proposedDecision,
      finalDecision: complaintData.decision,
      remarks: complaintData.remarks,
      source: complaintData.source || 'internal',
      createdBy: state.currentUser?.name
    });
    
    if (result.success) {
      const newComplaint = {
        id: result.id || complaintData.id, date: complaintData.date,
        complainant: complaintData.complainant, accused: complaintData.accused,
        description: complaintData.description,
        shakha: complaintData.shakha || state.currentUser?.shakha,
        mahashakha: complaintData.mahashakha,
        status: complaintData.status || 'pending',
        proposedDecision: complaintData.proposedDecision,
        decision: complaintData.decision,
        remarks: complaintData.remarks,
        source: complaintData.source || 'internal'
      };
      state.complaints.unshift(newComplaint);
    }
    return result;
  } catch (error) {
    console.error('Error saving complaint:', error);
    return saveComplaintToGoogleSheets({ ...complaintData, useLocal: true });
  }
}

async function updateComplaintInGoogleSheets(complaintId, updateData) {
  if (!GOOGLE_SHEETS_CONFIG.ENABLED || state.useLocalData) {
    const index = state.complaints.findIndex(c => c.id === complaintId);
    if (index !== -1) {
      state.complaints[index] = { ...state.complaints[index], ...updateData };
      return { success: true, message: 'Complaint updated locally' };
    }
    return { success: false, message: 'Complaint not found' };
  }
  
  try {
    const result = await postToGoogleSheets('updateComplaint', {
      id: complaintId, status: updateData.status,
      finalDecision: updateData.decision,
      remarks: updateData.remarks,
      updatedBy: state.currentUser?.name
    });
    
    if (result.success) {
      const index = state.complaints.findIndex(c => c.id === complaintId);
      if (index !== -1) {
        state.complaints[index] = { ...state.complaints[index], ...updateData };
      }
    }
    return result;
  } catch (error) {
    console.error('Error updating complaint:', error);
    return updateComplaintInGoogleSheets(complaintId, { ...updateData, useLocal: true });
  }
}

async function saveProjectToGoogleSheets(projectData) {
  if (!GOOGLE_SHEETS_CONFIG.ENABLED || state.useLocalData) {
    const newProject = {
      id: projectData.id || `P-${new Date().getFullYear()}-${state.projects.length + 1}`,
      name: projectData.name, organization: projectData.organization,
      inspectionDate: projectData.inspectionDate,
      nonCompliances: projectData.nonCompliances,
      improvementLetterDate: projectData.improvementLetterDate,
      improvementInfo: projectData.improvementInfo,
      status: projectData.status || 'pending',
      remarks: projectData.remarks,
      shakha: projectData.shakha || state.currentUser?.shakha,
      createdBy: state.currentUser?.name,
      createdAt: new Date().toISOString()
    };
    state.projects.unshift(newProject);
    return { success: true, message: 'Project saved locally' };
  }
  
  try {
    const result = await postToGoogleSheets('saveProject', {
      name: projectData.name, organization: projectData.organization,
      inspectionDate: projectData.inspectionDate,
      nonCompliances: projectData.nonCompliances,
      improvementLetterDate: projectData.improvementLetterDate,
      improvementInfo: projectData.improvementInfo,
      status: projectData.status || 'pending',
      remarks: projectData.remarks,
      shakha: projectData.shakha || state.currentUser?.shakha,
      createdBy: state.currentUser?.name
    });
    
    if (result.success) {
      const newProject = {
        id: result.id || projectData.id, name: projectData.name,
        organization: projectData.organization,
        inspectionDate: projectData.inspectionDate,
        nonCompliances: projectData.nonCompliances,
        improvementLetterDate: projectData.improvementLetterDate,
        improvementInfo: projectData.improvementInfo,
        status: projectData.status || 'pending',
        remarks: projectData.remarks,
        shakha: projectData.shakha || state.currentUser?.shakha
      };
      state.projects.unshift(newProject);
    }
    return result;
  } catch (error) {
    console.error('Error saving project:', error);
    return saveProjectToGoogleSheets({ ...projectData, useLocal: true });
  }
}

async function saveTechnicalProject() {
  const name = document.getElementById('projectName')?.value;
  const organization = document.getElementById('projectOrganization')?.value;
  const inspectionDate = document.getElementById('projectInspectionDate')?.value;
  const nonCompliances = document.getElementById('projectNonCompliances')?.value;
  const improvementLetterDate = document.getElementById('projectImprovementLetterDate')?.value;
  const status = document.getElementById('projectStatus')?.value;
  const improvementInfo = document.getElementById('projectImprovementInfo')?.value;
  const remarks = document.getElementById('projectRemarks')?.value;
  
  if (!name || !organization || !inspectionDate || !nonCompliances) {
    showToast('कृपया आवश्यक फिल्डहरू भर्नुहोस्', 'warning');
    return;
  }
  
  showLoadingIndicator(true);
  
  const projectData = {
    name, organization, inspectionDate, nonCompliances,
    improvementLetterDate, status, improvementInfo, remarks,
    shakha: state.currentUser?.shakha
  };
  
  const result = await saveProjectToGoogleSheets(projectData);
  
  showLoadingIndicator(false);
  
  if (result.success) {
    showToast('आयोजना सफलतापूर्वक सेभ गरियो', 'success');
    closeModal();
    showTechnicalProjectsView();
  } else {
    showToast(`आयोजना सेभ गर्दा त्रुटि: ${result.message}`, 'error');
  }
}

function addGoogleSheetsButtons() {
  const container = document.getElementById('sheetActions');
  if (!container) return;
  
  if (!document.getElementById('testSheetsBtn')) {
    const testBtn = document.createElement('button');
    testBtn.id = 'testSheetsBtn';
    testBtn.className = 'btn btn-sm btn-outline-primary';
    testBtn.innerHTML = '<i class="fas fa-plug"></i> Test Sheets';
    testBtn.addEventListener('click', testGoogleSheetsConnection);
    container.appendChild(testBtn);
  }
  
  if (!document.getElementById('syncSheetsBtn')) {
    const unsyncedCount = state.complaints?.filter(c => !c.syncedToSheets).length || 0;
    const syncBtn = document.createElement('button');
    syncBtn.id = 'syncSheetsBtn';
    syncBtn.className = `btn btn-sm ${unsyncedCount === 0 ? 'btn-success' : 'btn-warning'}`;
    syncBtn.innerHTML = `<i class="fas fa-sync"></i> Sync (${unsyncedCount})`;
    syncBtn.addEventListener('click', syncAllDataToGoogleSheets);
    container.appendChild(syncBtn);
  }
}

function printComplaint(complaintId) {
  const complaint = state.complaints.find(c => c.id === complaintId);
  if (!complaint) return;
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>उजुरी दर्ता - ${complaint.id}</title>
      <style>
        body { font-family: 'Arial', sans-serif; padding: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; }
        .subtitle { font-size: 16px; color: #666; }
        .content { margin-top: 30px; }
        .row { display: flex; margin-bottom: 15px; }
        .label { width: 200px; font-weight: bold; }
        .value { flex: 1; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">राष्ट्रिय सतर्कता केन्द्र</div>
        <div class="subtitle">उजुरी दर्ता प्रमाणपत्र</div>
      </div>
      <div class="content">
        <div class="row"><div class="label">दर्ता नं:</div><div class="value">${complaint.id}</div></div>
        <div class="row"><div class="label">दर्ता मिति:</div><div class="value">${complaint.date}</div></div>
        <div class="row"><div class="label">उजुरकर्ताको नाम:</div><div class="value">${complaint.complainant}</div></div>
        <div class="row"><div class="label">विपक्षी:</div><div class="value">${complaint.accused || '-'}</div></div>
        <div class="row"><div class="label">उजुरीको विवरण:</div><div class="value">${complaint.description}</div></div>
        <div class="row"><div class="label">सम्बन्धित शाखा:</div><div class="value">${complaint.shakha || '-'}</div></div>
        <div class="row"><div class="label">स्थिति:</div><div class="value">${complaint.status === 'pending' ? 'काम बाँकी' : complaint.status === 'progress' ? 'चालु' : 'फछ्रयौट'}</div></div>
      </div>
      <div class="footer">
        <p>यो प्रमाणपत्र राष्ट्रिय सतर्कता केन्द्रको प्रणालीबाट स्वचालित रूपमा जारी गरिएको हो।</p>
        <p>मिति: ${new Date().toLocaleString('ne-NP')}</p>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

async function generateReportFromGoogleSheets(reportType, params = {}) {
  if (!GOOGLE_SHEETS_CONFIG.ENABLED || state.useLocalData) {
    return generateReportFromLocalData(reportType, params);
  }
  
  try {
    const result = await postToGoogleSheets('generateReport', params);
    if (result.success) {
      return { success: true, data: result.data, statistics: result.statistics, generatedAt: result.generatedAt };
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error generating report from Google Sheets:', error);
    return generateReportFromLocalData(reportType, params);
  }
}

function generateReportFromLocalData(reportType, params) {
  let data = [];
  let statistics = {};
  
  switch(reportType) {
    case 'monthly':
      const currentDate = new Date();
      data = state.complaints.filter(c => {
        const complaintDate = new Date(c.date);
        return complaintDate.getMonth() === currentDate.getMonth() && 
               complaintDate.getFullYear() === currentDate.getFullYear();
      });
      break;
    case 'shakha':
      data = params.shakha ? state.complaints.filter(c => c.shakha === params.shakha) : state.complaints;
      break;
    case 'custom':
      // Helper to normalize date string to YYYY-MM-DD (Latin digits)
      const getNormalizedDate = (dateStr) => {
        if (!dateStr) return '';
        let s = String(dateStr).trim();
        if (typeof _devnagariToLatin === 'function') s = _devnagariToLatin(s);
        const match = s.match(/(\d{4})[\-\/.](\d{1,2})[\-\/.](\d{1,2})/);
        if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        return s;
      };

      const start = getNormalizedDate(params.startDate);
      const end = getNormalizedDate(params.endDate);

      data = state.complaints.filter(c => {
        const cDate = getNormalizedDate(c.date || c['दर्ता मिति']);
        if (!cDate) return false;

        let include = true;
        if (start && end) include = include && (cDate >= start && cDate <= end);
        if (params.status) include = include && (c.status === params.status);
        if (params.shakha) include = include && (c.shakha === params.shakha);
        return include;
      });
      break;
    case 'summary':
      statistics = {
        total: state.complaints.length,
        pending: state.complaints.filter(c => c.status === 'pending').length,
        progress: state.complaints.filter(c => c.status === 'progress').length,
        resolved: state.complaints.filter(c => c.status === 'resolved').length,
        closed: state.complaints.filter(c => c.status === 'closed').length
      };
      statistics.resolutionRate = statistics.total > 0 ? Math.round((statistics.resolved / statistics.total) * 100) : 0;
      break;
  }
  
  if (reportType !== 'summary') {
    statistics = {
      total: data.length,
      pending: data.filter(c => c.status === 'pending').length,
      progress: data.filter(c => c.status === 'progress').length,
      resolved: data.filter(c => c.status === 'resolved').length,
      closed: data.filter(c => c.status === 'closed').length
    };
    statistics.resolutionRate = statistics.total > 0 ? Math.round((statistics.resolved / statistics.total) * 100) : 0;
  }
  
  return { success: true, data, statistics, generatedAt: new Date().toISOString() };
}

async function generateCustomReport() {
  const startDate = document.getElementById('reportStartDate')?.value;
  const endDate = document.getElementById('reportEndDate')?.value;
  const status = document.getElementById('reportStatus')?.value;
  let shakha = document.getElementById('reportShakha')?.value || '';
  
  // शाखा लगइन भएको खण्डमा सोही शाखाको मात्र रिपोर्ट आउने बनाउन
  if (!shakha && state.currentUser && state.currentUser.role === 'shakha') {
    shakha = SHAKHA[state.currentUser.shakha] || state.currentUser.shakha;
  }
  
  if (!startDate || !endDate) {
    showToast('कृपया मिति उल्लेख गर्नुहोस्', 'warning');
    return;
  }
  
  showLoadingIndicator(true);
  
  // Helper to normalize date string to YYYY-MM-DD (Latin digits)
  const getNormalizedDate = (dateStr) => {
    if (!dateStr) return '';
    let s = String(dateStr).trim();
    // Convert Devanagari to Latin using existing helper
    if (typeof _devnagariToLatin === 'function') {
        s = _devnagariToLatin(s);
    }
    // Extract YYYY-MM-DD if present
    const match = s.match(/(\d{4})\-\/.\-\/./);
    if (match) {
      return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    }
    return s;
  };

  const start = getNormalizedDate(startDate);
  const end = getNormalizedDate(endDate);

  // Filter local data directly from state.complaints
  const filteredData = state.complaints.filter(c => {
    // Normalize complaint date
    const cDate = getNormalizedDate(c.date || c['दर्ता मिति']);
    if (!cDate) return false;
    
    // Date Range Check (String comparison works for ISO YYYY-MM-DD)
    if (cDate < start || cDate > end) return false;
    
    // Status Check
    if (status && c.status !== status) return false;
    
    // Shakha Check
    if (shakha) {
       const cShakha = c.shakha || '';
       // Check exact match or if shakha name is contained
       if (cShakha !== shakha && !cShakha.includes(shakha)) return false;
    }
    
    return true;
  });
  
  showLoadingIndicator(false);
  
  if (filteredData.length > 0) {
    // Format for Excel/CSV
    const reportData = filteredData.map(c => ({
      'दर्ता नं': c.id,
      'दर्ता मिति': c.date,
      'उजुरकर्ता': c.complainant,
      'विपक्षी': c.accused || '',
      'उजुरीको विवरण': c.description,
      'शाखा': c.shakha || '',
      'स्थिति': c.status === 'resolved' ? 'फछ्रयौट' : (c.status === 'progress' ? 'चालु' : 'काम बाँकी'),
      'कैफियत': c.remarks || ''
    }));

    exportReportToExcel(reportData, `कस्टम_रिपोर्ट_${start}_देखि_${end}`);
    showToast(`${filteredData.length} वटा उजुरी भेटियो`, 'success');
  } else {
    showToast('उल्लेखित अवधिमा कुनै उजुरी भेटिएन', 'info');
  }
}

function exportReportToExcel(data, reportName) {
  if (data.length === 0) {
    showToast('एक्स्पोर्ट गर्न डाटा उपलब्ध छैन', 'warning');
    return;
  }
  
  const headers = Object.keys(data[0]);
  let csvContent = headers.join(',') + '\n';

  const isIsoDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

  data.forEach(row => {
    const values = headers.map(header => {
      let value = row[header];
      if (isIsoDate(value)) value = _latinToDevnagari(String(value));
      if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
      return value;
    });
    csvContent += values.join(',') + '\n';
  });
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  const filename = `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`;
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast(`रिपोर्ट ${filename} मा डाउनलोड भयो`, 'success');
}

function exportToExcel(type) {
  let data = [];
  let filename = '';
  
  switch(type) {
    case 'complaints':
      data = state.currentUser.role === 'admin' ? state.complaints : 
             state.complaints.filter(c => c.shakha === state.currentUser.shakha);
      filename = `उजुरीहरू_${new Date().toISOString().slice(0,10)}.csv`;
      break;
    case 'all_complaints':
      data = state.complaints;
      filename = `सबै_उजुरीहरू_${new Date().toISOString().slice(0,10)}.csv`;
      break;
    case 'hello_sarkar':
      data = state.complaints.filter(c => c.source === 'hello_sarkar');
      filename = `हेलो_सरकारबाट_प्राप्त_उजुरीहरू_${new Date().toISOString().slice(0,10)}.csv`;
      break;
    case 'technical_projects':
      data = state.projects.filter(p => p.shakha === state.currentUser.shakha);
      filename = `विकास_योजनाहरू_${new Date().toISOString().slice(0,10)}.csv`;
      break;
    case 'employee_monitoring':
      data = state.employeeMonitoring;
      filename = `कार्यालय_अनुगमन_${new Date().toISOString().slice(0,10)}.csv`;
      break;
    case 'recent':
      data = state.complaints.slice(0, 10);
      filename = `हालैका_उजुरीहरू_${new Date().toISOString().slice(0,10)}.csv`;
      break;
    case 'shakha_reports':
    case 'shakha_stats':
      const shakhaStats = {};
      state.complaints.forEach(complaint => {
        const shakha = complaint.shakha || 'अन्य';
        if (!shakhaStats[shakha]) shakhaStats[shakha] = { total: 0, pending: 0, progress: 0, resolved: 0, closed: 0 };
        shakhaStats[shakha].total++;
        if (complaint.status === 'pending') shakhaStats[shakha].pending++;
        if (complaint.status === 'progress') shakhaStats[shakha].progress++;
        if (complaint.status === 'resolved') shakhaStats[shakha].resolved++;
        if (complaint.status === 'closed') shakhaStats[shakha].closed++;
      });
      
      data = Object.keys(shakhaStats).map(shakha => {
        const stats = shakhaStats[shakha];
        const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
        return {
          शाखा: shakha, 'कूल उजुरी': stats.total, 'काम बाँकी': stats.pending,
          'चालु': stats.progress, 'फछ्रयौट': stats.resolved,
          'फछ्रयौट दर': resolutionRate + '%'
        };
      });
      filename = `शाखा_रिपोर्ट_${new Date().toISOString().slice(0,10)}.csv`;
      break;
    default:
      data = state.complaints;
      filename = `डाटा_${new Date().toISOString().slice(0,10)}.csv`;
  }
  
  if (data.length === 0) {
    showToast('डाटा छैन', 'warning');
    return;
  }
  
  const headers = Object.keys(data[0]);
  let csvContent = headers.join(',') + '\n';
  const isIsoDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  data.forEach(row => {
    const values = headers.map(header => {
      let value = row[header];
      if (isIsoDate(value)) value = _latinToDevnagari(String(value));
      if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
      return value;
    });
    csvContent += values.join(',') + '\n';
  });
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast(`CSV फाइल डाउनलोड हुँदैछ: ${filename}`, 'success');
}

function exportShakhaDetails(shakha) {
  const shakhaComplaints = state.complaints.filter(c => c.shakha === shakha);
  
  if (shakhaComplaints.length === 0) {
    showToast('यो शाखाका लागि कुनै उजुरी छैन', 'info');
    return;
  }
  
  const data = shakhaComplaints.map(complaint => ({
    'दर्ता नं': complaint.id, 'मिति': complaint.date,
    'उजुरकर्ता': complaint.complainant, 'विपक्षी': complaint.accused || '',
    'उजुरीको विवरण': complaint.description,
    'स्थिति': complaint.status === 'resolved' ? 'फछ्रयौट' : complaint.status === 'pending' ? 'काम बाँकी' : 'चालु',
    'निर्णय': complaint.decision || '', 'कैफियत': complaint.remarks || ''
  }));
  
  exportReportToExcel(data, `${shakha}_उजुरीहरू`);
}

function openModal(title, content) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = content;
  document.getElementById('complaintModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('complaintModal').classList.add('hidden');
}

function openShakhaSelection() {
  document.getElementById('shakhaModal').classList.remove('hidden');
  
  const modalBody = document.querySelector('#shakhaModal .modal-body');
  modalBody.innerHTML = Object.entries(SHAKHA).map(([key, value]) => `
    <div class="module-card text-center" onclick="selectShakha('${key}')">
      <div class="module-icon"><i class="fas fa-building"></i></div>
      <h4 class="module-title">${value}</h4>
    </div>
  `).join('');
}

function closeShakhaModal() {
  document.getElementById('shakhaModal').classList.add('hidden');
}

function selectShakha(shakhaCode) {
  const shakhaName = SHAKHA[shakhaCode] || shakhaCode;
  document.getElementById('loginPageTitle').textContent = `${shakhaName} लग-इन`;
  document.getElementById('loginPageSubtitle').textContent = 'कृपया युजरनेम र पासवर्ड प्रविष्ट गर्नुहोस्';
  closeShakhaModal();
  showPage('loginPage');
}

async function loadNotifications() {
  // 1. Load local pushed notifications
  const localPushed = JSON.parse(localStorage.getItem('nvc_pushed_notifications') || '[]');
  
  let remoteNotifications = [];
  
  // 2. Fetch from Google Sheets if enabled
  if (GOOGLE_SHEETS_CONFIG.ENABLED) {
      const now = Date.now();
      // Debounce: fetch max once every 30s unless forced
      if (!state.lastNotificationFetch || (now - state.lastNotificationFetch > 30000)) {
          try {
              const result = await getFromGoogleSheets('getNotifications');
              if (result && result.success && Array.isArray(result.data)) {
                  remoteNotifications = result.data;
                  state.remoteNotificationsCache = remoteNotifications;
                  state.lastNotificationFetch = now;
              }
          } catch (e) {
              console.error('Error fetching notifications', e);
          }
      } else {
          remoteNotifications = state.remoteNotificationsCache || [];
      }
  }

  // 3. Combine with dummy data for demo
  const dummyNotifications = [
    { id: '1', title: 'नयाँ उजुरी दर्ता', time: '१० मिनेट अघि', read: false, targetShakha: 'all', type: 'info' },
    { id: '2', title: 'समिति बैठक', time: '२ घण्टा अघि', read: true, targetShakha: 'all', type: 'warning' }
  ];
  
  let allNotifications = [...localPushed, ...remoteNotifications, ...dummyNotifications];
  
  // Filter out deleted notifications
  const deletedIds = JSON.parse(localStorage.getItem('nvc_deleted_notifications') || '[]');
  allNotifications = allNotifications.filter(n => !deletedIds.includes(String(n.id)));

  // 4. Filter for current user
  const myNotifications = allNotifications.filter(n => {
      if (!n.targetShakha || n.targetShakha === 'all') return true;
      if (state.currentUser.role === 'admin') return true;
      
      const userShakhaName = SHAKHA[state.currentUser.shakha] || state.currentUser.shakha;
      return n.targetShakha === state.currentUser.shakha || n.targetShakha === userShakhaName;
  });

  // 5. Apply read status from local storage (for read/unread styling)
  const readIds = JSON.parse(localStorage.getItem('nvc_read_notifications') || '[]');
  state.notifications = myNotifications.map(n => {
      // Handle string "true"/"false" from Sheets
      const isRead = n.read === true || n.read === 'true';
      return {
          ...n,
          read: isRead || readIds.includes(String(n.id))
      };
  });
  
  // Check for new notifications to play sound
  const currentIds = state.notifications.map(n => String(n.id));
  if (state.previousNotificationIds) {
      const newIds = currentIds.filter(id => !state.previousNotificationIds.includes(id));
      // If there are new IDs and at least one is unread
      const hasNewUnread = state.notifications.some(n => newIds.includes(String(n.id)) && !n.read);
      
      if (hasNewUnread) {
          playNotificationSound();
      }
  }
  state.previousNotificationIds = currentIds;

  // Filter for display based on selected type
  const currentFilter = state.notificationFilter || 'all';
  const filteredForDisplay = state.notifications.filter(n => {
      if (currentFilter === 'all') return true;
      return (n.type || 'info') === currentFilter;
  });

  // 6. Render
  const unreadCount = state.notifications.filter(n => !n.read).length;
  const notificationCount = document.getElementById('notificationCount');
  if (notificationCount) {
      notificationCount.textContent = unreadCount > 0 ? unreadCount : '';
      notificationCount.style.display = unreadCount > 0 ? 'flex' : 'none';
  }
  
  const dropdown = document.getElementById('notificationDropdown');
  if (dropdown) {
    const hasUnread = state.notifications.some(n => !n.read);
    
    let html = `
      <div class="notification-header">
        <span class="font-weight-bold">सूचनाहरू</span>
        ${hasUnread ? `<button class="btn-link" onclick="markAllNotificationsRead()">सबै पढियो</button>` : ''}
      </div>
      <div class="notification-filters">
        <button class="notif-filter-btn ${currentFilter === 'all' ? 'active' : ''}" onclick="filterNotifications('all')">सबै</button>
        <button class="notif-filter-btn ${currentFilter === 'info' ? 'active' : ''}" onclick="filterNotifications('info')">जानकारी</button>
        <button class="notif-filter-btn ${currentFilter === 'warning' ? 'active' : ''}" onclick="filterNotifications('warning')">चेतावनी</button>
        <button class="notif-filter-btn ${currentFilter === 'success' ? 'active' : ''}" onclick="filterNotifications('success')">सफल</button>
      </div>
    `;

    if (filteredForDisplay.length === 0) {
        html += `<div class="p-3 text-center text-muted text-small">कुनै सूचना छैन</div>`;
    } else {
        html += filteredForDisplay.slice(0, 10).map(n => `
          <div class="notification-item ${n.read ? '' : 'unread'} type-${n.type || 'info'}" onclick="markNotificationRead('${n.id}')" title="पढिएको रूपमा चिन्ह लगाउनुहोस्">
            <div class="notification-title">${n.title}</div>
            ${n.message ? `<div class="text-small text-muted text-limit">${n.message}</div>` : ''}
            <div class="notification-time">${n.time || 'भर्खरै'}</div>
            <button class="notification-delete-btn" onclick="deleteNotification(event, '${n.id}')" title="यो सूचना हटाउनुहोस्">&times;</button>
          </div>
        `).join('');
    }
    
    dropdown.innerHTML = html;
  }
}

function filterNotifications(type) {
    state.notificationFilter = type;
    // Prevent dropdown from closing by stopping propagation if called from event, but here we just reload
    loadNotifications();
}

function markNotificationRead(id) {
  const readIds = JSON.parse(localStorage.getItem('nvc_read_notifications') || '[]');
  if (!readIds.includes(String(id))) {
      readIds.push(String(id));
      localStorage.setItem('nvc_read_notifications', JSON.stringify(readIds));
  }

  const notification = state.notifications.find(n => String(n.id) === String(id));
  if (notification) {
    notification.read = true;
    loadNotifications();
  }
}

function markAllNotificationsRead() {
  const readIds = JSON.parse(localStorage.getItem('nvc_read_notifications') || '[]');
  let updated = false;

  state.notifications.forEach(n => {
    if (!n.read) {
      n.read = true;
      if (!readIds.includes(String(n.id))) {
        readIds.push(String(n.id));
      }
      updated = true;
    }
  });

  if (updated) {
    localStorage.setItem('nvc_read_notifications', JSON.stringify(readIds));
    loadNotifications();
    showToast('सबै सूचनाहरू पढिएको रूपमा चिन्ह लगाइयो', 'success');
  }
}

function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); // Drop to A4
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {
    console.error('Audio play failed', e);
  }
}

function deleteNotification(event, id) {
  event.stopPropagation(); // Prevent parent onclick (markAsRead)

  // 1. Get the list of deleted notification IDs from localStorage
  const deletedIds = JSON.parse(localStorage.getItem('nvc_deleted_notifications') || '[]');

  // 2. Add the new ID if it's not already there
  if (!deletedIds.includes(String(id))) {
    deletedIds.push(String(id));
    localStorage.setItem('nvc_deleted_notifications', JSON.stringify(deletedIds));
  }

  // 3. Optimistically remove from state and re-render
  state.notifications = state.notifications.filter(n => String(n.id) !== String(id));
  loadNotifications(); // This will re-render the list and update the count

  showToast('सूचना हटाइयो', 'info');

  // 4. Optional: Send delete request to Google Sheets
  if (GOOGLE_SHEETS_CONFIG.ENABLED) {
      postToGoogleSheets('deleteNotification', { id: id });
  }
}

function startNotificationPolling() {
  if (window.notificationInterval) clearInterval(window.notificationInterval);
  loadNotifications();
  window.notificationInterval = setInterval(loadNotifications, 60000); // Poll every minute
}

function toggleNotifications() {
  const dropdown = document.getElementById('notificationDropdown');
  if (dropdown) dropdown.classList.toggle('show');
}

function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) dropdown.classList.toggle('show');
}

function showPage(pageId) {
  console.log(`📄 Showing page: ${pageId}`);
  
  ['mainPage', 'loginPage', 'dashboardPage'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });
  
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.remove('hidden');
    state.currentPage = pageId;
  } else {
    console.error(`❌ Page not found: ${pageId}`);
    return;
  }
  
  if (pageId === 'dashboardPage') {
    initializeDashboard();
    if (state.currentUser && GOOGLE_SHEETS_CONFIG.ENABLED) {
      setTimeout(() => { loadDataFromGoogleSheets().then(loaded => { if (loaded && typeof updateStats === 'function') updateStats(); }); }, 1000);
    }
  }
  
  setTimeout(()=>{ initializeDatepickers(); initializeNepaliDropdowns(); }, 200);
}

function showDashboardPage() {
  if (!state.currentUser) {
    showPage('loginPage');
    return;
  }
  updateUserInfo();
  loadDashboardData();
  showPage('dashboardPage');
}

function togglePasswordVisibility(fieldId) {
    const input = document.getElementById(fieldId);
    if (input.type === "password") {
        input.type = "text";
    } else {
        input.type = "password";
    }
}

function handleLogin() {
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  
  if (!username || !password) {
    showToast('कृपया युजरनेम र पासवर्ड प्रविष्ट गर्नुहोस्', 'warning');
    return;
  }
  
  const loginBtn = document.getElementById('loginButton');
  const originalText = loginBtn.innerHTML;
  loginBtn.innerHTML = '<div class="spinner"></div>';
  loginBtn.disabled = true;
  
  setTimeout(() => {
    if (username === 'admin' && password === 'nvc123') {
      state.currentUser = {
        id: 'admin', name: 'एडमिन', role: 'admin',
        avatar: 'A', shakha: null,
        mahashakha: null, permissions: ['all']
      };
      
      const session = { user: state.currentUser, expires: Date.now() + (24 * 60 * 60 * 1000) };
      localStorage.setItem('nvc_session', JSON.stringify(session));
      
      showDashboardPage();
    } else {
      const user = findUserByCredentials(username, password);
      if (user) {
        const finalRole = user.role || 'shakha';
        
        // Determine Shakha Name (Use Nepali Name if available)
        let userShakha = null;
        if (finalRole === 'shakha' || finalRole === 'admin_planning') {
            userShakha = SHAKHA[user.code.toUpperCase()] || user.code;
        }

        state.currentUser = {
          id: user.code, name: user.name, role: finalRole,
          avatar: user.name.charAt(0), shakha: userShakha,
          mahashakha: user.mahashakha, permissions: user.permissions || []
        };
        
        const session = { user: state.currentUser, expires: Date.now() + (24 * 60 * 60 * 1000) };
        localStorage.setItem('nvc_session', JSON.stringify(session));
        
        showDashboardPage();
      } else {
        showToast('युजरनेम वा पासवर्ड मिलेन', 'error');
      }
    }
    
    loginBtn.innerHTML = originalText;
    loginBtn.disabled = false;
  }, 1000);
}

function handleForgotPassword(event) {
  event.preventDefault();
  const username = prompt('कृपया आफ्नो युजरनेम प्रविष्ट गर्नुहोस्:');
  
  if (!username || !username.trim()) {
    showToast('युजरनेम खाली हुन सक्दैन।', 'warning');
    return;
  }

  const trimmedUsername = username.trim().toLowerCase();

  if (trimmedUsername === 'admin') {
    alert("एडमिनको पासवर्ड 'nvc123' मा रिसेट गरिएको छ।");
    return;
  }

  const user = findUserByUsername(trimmedUsername);
  
  if (user) {
    alert(`'${user.name}' को लागि पासवर्ड रिसेट गरिएको छ।\n\nपूर्वनिर्धारित पासवर्ड हो: '${user.password}'\n\nकृपया फेरि लगइन गर्ने प्रयास गर्नुहोस्।`);
  } else {
    showToast('यो युजरनेम प्रणालीमा फेला परेन।', 'error');
  }
}

function getAllUsers() {
    const shakhas = [
        { code: 'admin_planning', name: SHAKHA.ADMIN_PLANNING, username: 'admin_plan', password: 'nvc@2026', mahashakha: MAHASHAKHA.ADMIN_MONITORING, permissions: ['admin_tasks'], role: 'admin_planning' },
        { code: 'info_collection', name: SHAKHA.INFO_COLLECTION, username: 'info_collect', password: 'nvc@2026', mahashakha: MAHASHAKHA.ADMIN_MONITORING, permissions: ['complaint_management'] },
        { code: 'complaint_management', name: SHAKHA.COMPLAINT_MANAGEMENT, username: 'complaint_mgmt', password: 'nvc@2026', mahashakha: MAHASHAKHA.ADMIN_MONITORING, permissions: ['complaint_management'] },
        { code: 'finance', name: SHAKHA.FINANCE, username: 'finance', password: 'nvc@2026', mahashakha: MAHASHAKHA.ADMIN_MONITORING, permissions: ['complaint_management'] },
        { code: 'policy_monitoring', name: SHAKHA.POLICY_MONITORING, username: 'policy_mon', password: 'nvc@2026', mahashakha: MAHASHAKHA.POLICY_LEGAL, permissions: ['complaint_management'] },
        { code: 'investigation', name: SHAKHA.INVESTIGATION, username: 'investigation', password: 'nvc@2026', mahashakha: MAHASHAKHA.POLICY_LEGAL, permissions: ['complaint_management'] },
        { code: 'legal_advice', name: SHAKHA.LEGAL_ADVICE, username: 'legal_advice', password: 'nvc@2026', mahashakha: MAHASHAKHA.POLICY_LEGAL, permissions: ['complaint_management'] },
        { code: 'asset_declaration', name: SHAKHA.ASSET_DECLARATION, username: 'asset_decl', password: 'nvc@2026', mahashakha: MAHASHAKHA.POLICY_LEGAL, permissions: ['complaint_management'] },
        { code: 'police_info_collection', name: SHAKHA.POLICE_INFO_COLLECTION, username: 'police_info', password: 'nvc@2026', mahashakha: MAHASHAKHA.POLICE, permissions: ['complaint_management'] },
        { code: 'police_monitoring', name: SHAKHA.POLICE_MONITORING, username: 'police_mon', password: 'nvc@2026', mahashakha: MAHASHAKHA.POLICE, permissions: ['complaint_management'] },
        { code: 'police_management', name: SHAKHA.POLICE_MANAGEMENT, username: 'police_mgmt', password: 'nvc@2026', mahashakha: MAHASHAKHA.POLICE, permissions: ['complaint_management'] },
        { code: 'police_investigation', name: SHAKHA.POLICE_INVESTIGATION, username: 'police_invest', password: 'nvc@2026', mahashakha: MAHASHAKHA.POLICE, permissions: ['complaint_management'] },
        { code: 'technical_1', name: SHAKHA.TECHNICAL_1, username: 'technical1', password: 'nvc@2026', mahashakha: MAHASHAKHA.TECHNICAL, permissions: ['complaint_management', 'technical_inspection'] },
        { code: 'technical_2', name: SHAKHA.TECHNICAL_2, username: 'technical2', password: 'nvc@2026', mahashakha: MAHASHAKHA.TECHNICAL, permissions: ['complaint_management', 'technical_inspection'] },
        { code: 'technical_3', name: SHAKHA.TECHNICAL_3, username: 'technical3', password: 'nvc@2026', mahashakha: MAHASHAKHA.TECHNICAL, permissions: ['complaint_management', 'technical_inspection'] },
        { code: 'technical_4', name: SHAKHA.TECHNICAL_4, username: 'technical4', password: 'nvc@2026', mahashakha: MAHASHAKHA.TECHNICAL, permissions: ['complaint_management', 'technical_inspection'] }
    ];
    
    const mahashakhas = [
        { code: 'admin_monitoring_div', name: MAHASHAKHA.ADMIN_MONITORING, username: 'admin_mon_head', password: 'nvc@2026', role: 'mahashakha', mahashakha: MAHASHAKHA.ADMIN_MONITORING },
        { code: 'policy_legal_div', name: MAHASHAKHA.POLICY_LEGAL, username: 'policy_head', password: 'nvc@2026', role: 'mahashakha', mahashakha: MAHASHAKHA.POLICY_LEGAL },
        { code: 'police_div', name: MAHASHAKHA.POLICE, username: 'police_head', password: 'nvc@2026', role: 'mahashakha', mahashakha: MAHASHAKHA.POLICE },
        { code: 'technical_div', name: MAHASHAKHA.TECHNICAL, username: 'technical_head', password: 'nvc@2026', role: 'mahashakha', mahashakha: MAHASHAKHA.TECHNICAL }
    ];

    return [...shakhas, ...mahashakhas];
}

function findUserByUsername(username) {
    const allUsers = getAllUsers();
    return allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
}

function findUserByCredentials(username, password) {
  const shakhas = [
    { code: 'admin_planning', name: SHAKHA.ADMIN_PLANNING, username: 'admin_plan', password: 'nvc@2026', mahashakha: MAHASHAKHA.ADMIN_MONITORING, permissions: ['admin_tasks'], role: 'admin_planning' },
    { code: 'info_collection', name: SHAKHA.INFO_COLLECTION, username: 'info_collect', password: 'nvc@2026', mahashakha: MAHASHAKHA.ADMIN_MONITORING, permissions: ['complaint_management'] },
    { code: 'complaint_management', name: SHAKHA.COMPLAINT_MANAGEMENT, username: 'complaint_mgmt', password: 'nvc@2026', mahashakha: MAHASHAKHA.ADMIN_MONITORING, permissions: ['complaint_management'] },
    { code: 'finance', name: SHAKHA.FINANCE, username: 'finance', password: 'nvc@2026', mahashakha: MAHASHAKHA.ADMIN_MONITORING, permissions: ['complaint_management'] },
    { code: 'policy_monitoring', name: SHAKHA.POLICY_MONITORING, username: 'policy_mon', password: 'nvc@2026', mahashakha: MAHASHAKHA.POLICY_LEGAL, permissions: ['complaint_management'] },
    { code: 'investigation', name: SHAKHA.INVESTIGATION, username: 'investigation', password: 'nvc@2026', mahashakha: MAHASHAKHA.POLICY_LEGAL, permissions: ['complaint_management'] },
    { code: 'legal_advice', name: SHAKHA.LEGAL_ADVICE, username: 'legal_advice', password: 'nvc@2026', mahashakha: MAHASHAKHA.POLICY_LEGAL, permissions: ['complaint_management'] },
    { code: 'asset_declaration', name: SHAKHA.ASSET_DECLARATION, username: 'asset_decl', password: 'nvc@2026', mahashakha: MAHASHAKHA.POLICY_LEGAL, permissions: ['complaint_management'] },
    { code: 'police_info_collection', name: SHAKHA.POLICE_INFO_COLLECTION, username: 'police_info', password: 'nvc@2026', mahashakha: MAHASHAKHA.POLICE, permissions: ['complaint_management'] },
    { code: 'police_monitoring', name: SHAKHA.POLICE_MONITORING, username: 'police_mon', password: 'nvc@2026', mahashakha: MAHASHAKHA.POLICE, permissions: ['complaint_management'] },
    { code: 'police_management', name: SHAKHA.POLICE_MANAGEMENT, username: 'police_mgmt', password: 'nvc@2026', mahashakha: MAHASHAKHA.POLICE, permissions: ['complaint_management'] },
    { code: 'police_investigation', name: SHAKHA.POLICE_INVESTIGATION, username: 'police_invest', password: 'nvc@2026', mahashakha: MAHASHAKHA.POLICE, permissions: ['complaint_management'] },
    { code: 'technical_1', name: SHAKHA.TECHNICAL_1, username: 'technical1', password: 'nvc@2026', mahashakha: MAHASHAKHA.TECHNICAL, permissions: ['complaint_management', 'technical_inspection'] },
    { code: 'technical_2', name: SHAKHA.TECHNICAL_2, username: 'technical2', password: 'nvc@2026', mahashakha: MAHASHAKHA.TECHNICAL, permissions: ['complaint_management', 'technical_inspection'] },
    { code: 'technical_3', name: SHAKHA.TECHNICAL_3, username: 'technical3', password: 'nvc@2026', mahashakha: MAHASHAKHA.TECHNICAL, permissions: ['complaint_management', 'technical_inspection'] },
    { code: 'technical_4', name: SHAKHA.TECHNICAL_4, username: 'technical4', password: 'nvc@2026', mahashakha: MAHASHAKHA.TECHNICAL, permissions: ['complaint_management', 'technical_inspection'] }
  ];
  
  const mahashakhas = [
    { code: 'admin_monitoring_div', name: MAHASHAKHA.ADMIN_MONITORING, username: 'admin_mon_head', password: 'nvc@2026', role: 'mahashakha', mahashakha: MAHASHAKHA.ADMIN_MONITORING },
    { code: 'policy_legal_div', name: MAHASHAKHA.POLICY_LEGAL, username: 'policy_head', password: 'nvc@2026', role: 'mahashakha', mahashakha: MAHASHAKHA.POLICY_LEGAL },
    { code: 'police_div', name: MAHASHAKHA.POLICE, username: 'police_head', password: 'nvc@2026', role: 'mahashakha', mahashakha: MAHASHAKHA.POLICE },
    { code: 'technical_div', name: MAHASHAKHA.TECHNICAL, username: 'technical_head', password: 'nvc@2026', role: 'mahashakha', mahashakha: MAHASHAKHA.TECHNICAL }
  ];

  return [...shakhas, ...mahashakhas].find(u => u.username === username && u.password === password);
}

function logout() {
  if (!confirm('के तपाईं लग-आउट गर्न चाहनुहुन्छ?')) return;
  state.currentUser = null;
  localStorage.removeItem('nvc_session');
  if (window.notificationInterval) clearInterval(window.notificationInterval);
  showPage('mainPage');
}

function initializeDashboard() {
  updateUserInfo();
  loadDashboardData();
  setupEventListeners();
  loadSidebarNavigation();
  showDashboardView();
  startNotificationPolling();
  addGoogleSheetsButtons();
  addRefreshButton();
  updateSyncButton();
}

function updateUserInfo() {
  if (!state.currentUser) return;
  
  const userName = document.getElementById('userName');
  const userRole = document.getElementById('userRole');
  const userAvatar = document.getElementById('userAvatar');
  const topbarUserName = document.getElementById('topbarUserName');
  const topbarUserRole = document.getElementById('topbarUserRole');
  const topbarAvatar = document.getElementById('topbarAvatar');
  
  if (userName) userName.textContent = state.currentUser.name;
  if (userRole) userRole.textContent = state.currentUser.role === 'admin' ? 'एडमिन' : SHAKHA[state.currentUser.shakha] || state.currentUser.shakha;
  if (userAvatar) userAvatar.textContent = state.currentUser.avatar;
  if (topbarUserName) topbarUserName.textContent = state.currentUser.name;
  if (topbarUserRole) topbarUserRole.textContent = state.currentUser.role === 'admin' ? 'एडमिन' : SHAKHA[state.currentUser.shakha] || state.currentUser.shakha;
  if (topbarAvatar) topbarAvatar.textContent = state.currentUser.avatar;
}

function loadDashboardData() {
  loadNotifications();
  updateStats();
}

function updateStats() {
  const total = state.complaints.length;
  const pending = state.complaints.filter(c => c.status === 'pending').length;
  const resolved = state.complaints.filter(c => c.status === 'resolved').length;
  const thisMonth = state.complaints.filter(c => {
    const today = new Date();
    const complaintDate = new Date(c.date);
    return complaintDate.getMonth() === today.getMonth() && 
           complaintDate.getFullYear() === today.getFullYear();
  }).length;
  
  const totalEl = document.getElementById('totalComplaintsMain');
  const pendingEl = document.getElementById('pendingComplaintsMain');
  const resolvedEl = document.getElementById('resolvedComplaintsMain');
  
  if (totalEl) totalEl.textContent = total;
  if (pendingEl) pendingEl.textContent = pending;
  if (resolvedEl) resolvedEl.textContent = resolved;
}

function setupEventListeners() {
  if (window._listenersAttached) return;
  window._listenersAttached = true;

  document.addEventListener('click', function(e) {
    // Close notification dropdown if clicked outside
    if (!e.target.closest('.notification-bell')) {
      const dropdown = document.getElementById('notificationDropdown');
      if (dropdown) dropdown.classList.remove('show');
    }
    
    // Close modals if clicked on backdrop
    const modal = document.getElementById('complaintModal');
    if (e.target === modal) closeModal();
    
    const shakhaModal = document.getElementById('shakhaModal');
    if (e.target === shakhaModal) closeShakhaModal();

    // Handle user menu toggle, logout, and closing
    const userMenuTrigger = e.target.closest('.user-menu');
    const logoutButton = e.target.closest('#logoutButton');

    if (logoutButton) {
        logout();
    } else if (userMenuTrigger) {
        toggleUserMenu();
    } else {
      const userDropdown = document.getElementById('userDropdown');
      if (userDropdown) userDropdown.classList.remove('show');
    }
  });

  // Delegated handler (capture) for action buttons to ensure handlers work
  // even after dynamic re-rendering / filtering of table rows.
  document.addEventListener('click', function(e) {
    try {
      const btn = e.target.closest && e.target.closest('.action-btn[data-action]');
      if (!btn) return;
      // Delegated handler: call action function but avoid overriding native events

      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');

      // Resolve function name: explicit data-func, common shorthand mapping, or raw action
      const shorthandMap = {
        view: 'viewComplaint',
        edit: 'editComplaint',
        delete: 'deleteComplaint',
        assign: 'assignToShakha'
      };
      const funcName = btn.getAttribute('data-func') || (action ? (shorthandMap[action] || action) : null);

      if (funcName && typeof window[funcName] === 'function') {
        window[funcName](id);
      } else if (typeof handleTableActions === 'function') {
        // fallback to legacy table handler if direct function mapping not found
        try { handleTableActions(e); } catch (hfErr) { console.warn('handleTableActions fallback failed', hfErr); }
      } else {
        console.warn('No handler found for action:', action, 'funcName:', funcName);
      }

      // If the button requested closing modal after action, do it
      if (btn.getAttribute('data-close') === 'true' && typeof window.closeModal === 'function') {
        try { closeModal(); } catch(_) {}
      }
    } catch (err) {
      console.error('Error in delegated action-btn handler', err);
    }
  }, true); // use capture so we intercept before target phase
}

function loadSidebarNavigation() {
  const nav = document.getElementById('sidebarNav');
  if (!nav || !state.currentUser) return;
  
  // उजुरी फिल्टर गर्ने (शाखा अनुसार)
  let complaintsForPending = state.complaints;
  if (state.currentUser.role === 'shakha') {
    complaintsForPending = complaintsForPending.filter(c => c.shakha === SHAKHA[state.currentUser.shakha] || c.shakha === state.currentUser.shakha);
  }
  else if (state.currentUser.role === 'mahashakha') {
    complaintsForPending = complaintsForPending.filter(c => c.mahashakha === state.currentUser.mahashakha || c.mahashakha === state.currentUser.name);
  }
  const pendingCount = complaintsForPending.filter(c => c.status === 'pending').length;
  
  let navItems = '';
  
  if (state.currentUser.role === 'admin') {
    navItems = `
      <a href="#" class="nav-item active" onclick="showDashboardView(); return false;"><i class="fas fa-tachometer-alt"></i><span class="nav-text">ड्यासबोर्ड</span></a>
      <a href="#" class="nav-item" onclick="showAllComplaintsView(); return false;"><i class="fas fa-file-alt"></i><span class="nav-text">सबै उजुरीहरू</span><span class="badge badge-danger ms-auto" id="pendingCount">${pendingCount}</span></a>
      <a href="#" class="nav-item" onclick="showHotspotMap(); return false;"><i class="fas fa-map-marked-alt"></i><span class="nav-text">हटस्पट नक्सा</span></a>
      <a href="#" class="nav-item" onclick="showShakhaReportsView(); return false;"><i class="fas fa-chart-bar"></i><span class="nav-text">शाखा रिपोर्टहरू</span></a>
      <a href="#" class="nav-item" onclick="showUserManagementView(); return false;"><i class="fas fa-users"></i><span class="nav-text">प्रयोगकर्ता व्यवस्थापन</span></a>
      <a href="#" class="nav-item" onclick="showSystemReportsView(); return false;"><i class="fas fa-chart-line"></i><span class="nav-text">रिपोर्टहरू</span></a>
      <a href="#" class="nav-item" onclick="showSettingsView(); return false;"><i class="fas fa-cog"></i><span class="nav-text">सेटिङहरू</span></a>
    `;
  } else if (state.currentUser.role === 'mahashakha') {
    navItems = `
      <a href="#" class="nav-item active" onclick="showDashboardView()"><i class="fas fa-tachometer-alt"></i><span class="nav-text">ड्यासबोर्ड</span></a>
      <a href="#" class="nav-item" onclick="showComplaintsView()"><i class="fas fa-file-alt"></i><span class="nav-text">महाशाखा अन्तर्गतका उजुरी</span><span class="badge badge-danger ms-auto" id="pendingCount">${pendingCount}</span></a>
      <a href="#" class="nav-item" onclick="showShakhaReportsView()"><i class="fas fa-chart-bar"></i><span class="nav-text">शाखा रिपोर्टहरू</span></a>
      <a href="#" class="nav-item" onclick="showReportsView()"><i class="fas fa-chart-line"></i><span class="nav-text">रिपोर्टहरू</span></a>
      <a href="#" class="nav-item" onclick="showSettingsView()"><i class="fas fa-cog"></i><span class="nav-text">सेटिङहरू</span></a>
    `;
  } else if (state.currentUser.role === 'admin_planning') {
    const helloSarkarPending = state.complaints.filter(c => c.source === 'hello_sarkar' && c.status === 'pending').length;
    navItems = `
      <a href="#" class="nav-item active" onclick="showDashboardView()"><i class="fas fa-tachometer-alt"></i><span class="nav-text">ड्यासबोर्ड</span></a>
      <a href="#" class="nav-item" onclick="showAdminComplaintsView()"><i class="fas fa-file-alt"></i><span class="nav-text">हेलो सरकार उजुरीहरू</span><span class="badge badge-danger ms-auto">${helloSarkarPending}</span></a>
      <a href="#" class="nav-item" onclick="showEmployeeMonitoringView()"><i class="fas fa-user-clock"></i><span class="nav-text">कार्यालय अनुगमन</span></a>
      <a href="#" class="nav-item" onclick="showCitizenCharterView()"><i class="fas fa-file-contract"></i><span class="nav-text">नागरिक बडापत्र अनुगमन</span></a>
      <a href="#" class="nav-item" onclick="showReportsView()"><i class="fas fa-chart-bar"></i><span class="nav-text">रिपोर्टहरू</span></a>
    `;
  } else if (state.currentUser.permissions?.includes('technical_inspection')) {
    navItems = `
      <a href="#" class="nav-item active" onclick="showDashboardView()"><i class="fas fa-tachometer-alt"></i><span class="nav-text">ड्यासबोर्ड</span></a>
      <a href="#" class="nav-item" onclick="showComplaintsView()"><i class="fas fa-file-alt"></i><span class="nav-text">उजुरीहरू</span><span class="badge badge-danger ms-auto">${pendingCount}</span></a>
      <a href="#" class="nav-item" onclick="showNewComplaintView()"><i class="fas fa-plus-circle"></i><span class="nav-text">नयाँ उजुरी</span></a>
      <a href="#" class="nav-item" onclick="showTechnicalProjectsView()"><i class="fas fa-hard-hat"></i><span class="nav-text">प्राविधिक परीक्षण/आयोजना अनुगमन</span></a>
      <a href="#" class="nav-item" onclick="showReportsView()"><i class="fas fa-chart-bar"></i><span class="nav-text">रिपोर्टहरू</span></a>
      <a href="#" class="nav-item" onclick="showCalendarView()"><i class="fas fa-calendar-alt"></i><span class="nav-text">क्यालेन्डर</span></a>
    `;
  } else {
    navItems = `
      <a href="#" class="nav-item active" onclick="showDashboardView()"><i class="fas fa-tachometer-alt"></i><span class="nav-text">ड्यासबोर्ड</span></a>
      <a href="#" class="nav-item" onclick="showComplaintsView()"><i class="fas fa-file-alt"></i><span class="nav-text">उजुरीहरू</span><span class="badge badge-danger ms-auto">${pendingCount}</span></a>
      <a href="#" class="nav-item" onclick="showNewComplaintView()"><i class="fas fa-plus-circle"></i><span class="nav-text">नयाँ उजुरी</span></a>
      <a href="#" class="nav-item" onclick="showReportsView()"><i class="fas fa-chart-bar"></i><span class="nav-text">रिपोर्टहरू</span></a>
      <a href="#" class="nav-item" onclick="showCalendarView()"><i class="fas fa-calendar-alt"></i><span class="nav-text">क्यालेन्डर</span></a>
    `;
  }
  
  nav.innerHTML = navItems;
}

function initializeDashboardCharts() {
  if (typeof Chart === 'undefined') {
    console.warn('⚠️ Chart.js is not loaded');
    return;
  }
  
  console.log('📊 Initializing dashboard charts...');
  
  // Initialize global storage for chart data if not exists
  if (!window.nvcChartsData) window.nvcChartsData = {};
  if (!window.nvcChartsType) window.nvcChartsType = {};
  
  setTimeout(() => {
    const statusCanvas = document.getElementById('complaintStatusChart');
    if (statusCanvas) {
      if (window.nvcCharts.complaintStatus) window.nvcCharts.complaintStatus.destroy();
      
      // शाखा अनुसार फिल्टर
      let complaints = state.complaints;
      if (state.currentUser && state.currentUser.role === 'shakha') {
        const userShakhaName = (state.currentUser.shakha || '').trim();
        const userCode = (state.currentUser.id || '').trim();
        complaints = complaints.filter(c => {
          const cShakha = (c.shakha || '').trim();
          return cShakha === userShakhaName || 
                 cShakha.toLowerCase() === userCode.toLowerCase() ||
                 SHAKHA[cShakha] === userShakhaName ||
                 SHAKHA[cShakha.toUpperCase()] === userShakhaName;
        });
      }
      else if (state.currentUser && state.currentUser.role === 'mahashakha') {
        complaints = complaints.filter(c => c.mahashakha === state.currentUser.mahashakha || c.mahashakha === state.currentUser.name);
        
        // Apply Mahashakha Filter if selected
        const mahashakhaFilter = document.getElementById('mahashakhaFilterShakha');
        if (mahashakhaFilter && mahashakhaFilter.value) {
            complaints = complaints.filter(c => c.shakha === mahashakhaFilter.value);
        }
      }
      
      const pending = complaints.filter(c => c.status === 'pending').length;
      const progress = complaints.filter(c => c.status === 'progress').length;
      const resolved = complaints.filter(c => c.status === 'resolved').length;
      
      // Store data for type toggling
      window.nvcChartsData.complaintStatus = {
          labels: ['काम बाँकी', 'चालु', 'फछ्रयौट'],
          datasets: [{
              data: [pending, progress, resolved],
              backgroundColor: ['rgba(255, 143, 0, 0.8)', 'rgba(30, 136, 229, 0.8)', 'rgba(46, 125, 50, 0.8)'],
              borderColor: ['rgba(255, 143, 0, 1)', 'rgba(30, 136, 229, 1)', 'rgba(46, 125, 50, 1)'],
              borderWidth: 1
          }]
      };

      try {
        window.nvcCharts.complaintStatus = new Chart(statusCanvas.getContext('2d'), {
          type: window.nvcChartsType['complaintStatusChart'] || window.nvcChartsType.complaintStatus || 'doughnut',
          data: window.nvcChartsData.complaintStatus,
          options: {
            responsive: true, maintainAspectRatio: false,
            onClick: (evt, elements, chart) => {
                if (elements.length > 0) {
                    const i = elements[0].index;
                    const label = chart.data.labels[i];
                    const statusMap = { 'काम बाँकी': 'pending', 'चालु': 'progress', 'फछ्रयौट': 'resolved' };
                    showChartDrillDown({ status: statusMap[label] || '' }, `${label} उजुरीहरू`);
                }
            },
            plugins: {
              legend: { position: 'bottom', labels: { padding: 10, font: { size: 11 } } },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.raw || 0;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                    return `${label}: ${value} (${percentage}%)`;
                  }
                }
              }
            }
          }
        });
      } catch (e) { console.error('❌ Error creating chart:', e); }
    }
    
    const shakhaCtx = document.getElementById('shakhaChart');
    if (shakhaCtx) {
      if (window.nvcCharts.shakhaChart) window.nvcCharts.shakhaChart.destroy();

      const shakhaStats = {};
      (state.complaints || []).forEach(complaint => {
        const shakha = complaint.shakha || 'अन्य';
        if (!shakhaStats[shakha]) shakhaStats[shakha] = { pending: 0, progress: 0, resolved: 0 };
        if (complaint.status === 'pending') shakhaStats[shakha].pending++;
        else if (complaint.status === 'progress') shakhaStats[shakha].progress++;
        else if (complaint.status === 'resolved') shakhaStats[shakha].resolved++;
      });
      
      const shakhas = Object.keys(shakhaStats);
      const pendingData = shakhas.map(shakha => shakhaStats[shakha].pending);
      const progressData = shakhas.map(shakha => shakhaStats[shakha].progress);
      const resolvedData = shakhas.map(shakha => shakhaStats[shakha].resolved);

      window.nvcChartsData.shakhaChart = {
          labels: shakhas,
          datasets: [
              { label: 'काम बाँकी', data: pendingData, backgroundColor: 'rgba(255, 143, 0, 0.8)', borderWidth: 0, borderRadius: 4 },
              { label: 'चालु', data: progressData, backgroundColor: 'rgba(30, 136, 229, 0.8)', borderWidth: 0, borderRadius: 4 },
              { label: 'फछ्रयौट', data: resolvedData, backgroundColor: 'rgba(46, 125, 50, 0.8)', borderWidth: 0, borderRadius: 4 }
          ]
      };

      try {
        window.nvcCharts.shakhaChart = new Chart(shakhaCtx.getContext('2d'), {
          type: window.nvcChartsType.shakhaChart || 'bar',
          data: window.nvcChartsData.shakhaChart,
          options: {
            indexAxis: 'y', // Horizontal bar for better readability
            responsive: true, maintainAspectRatio: false,
            barThickness: 15,
            maxBarThickness: 25,
            onClick: (evt, elements, chart) => {
                if (elements.length > 0) {
                    const i = elements[0].index;
                    const label = chart.data.labels[i];
                    showChartDrillDown({ shakha: label }, `${label} शाखाका उजुरीहरू`);
                }
            },
            scales: {
              x: { 
                stacked: true,
                beginAtZero: true, 
                grid: { display: false } 
              },
              y: { 
                stacked: true,
                grid: { display: false }, 
                ticks: { font: { size: 11 } } 
              }
            },
            plugins: {
              legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } }
            }
          }
        });
        
        // Double click for detailed breakdown
        shakhaCtx.ondblclick = (evt) => {
            const points = window.nvcCharts.shakhaChart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            if (points.length) {
                const i = points[0].index;
                const label = window.nvcCharts.shakhaChart.data.labels[i];
                viewShakhaDetails(label);
            }
        };
      } catch (e) { console.error('❌ Error creating shakha chart:', e); }
    }
    
    const trendCtx = document.getElementById('trendChart');
    if (trendCtx) {
      if (window.nvcCharts.trendChart) window.nvcCharts.trendChart.destroy();
      
      // Get filtered complaints for charts
      let chartComplaints = state.complaints || [];
      if (state.currentUser && state.currentUser.role === 'shakha') {
        const userShakhaName = (state.currentUser.shakha || '').trim();
        const userCode = (state.currentUser.id || '').trim();
        chartComplaints = chartComplaints.filter(c => {
          const cShakha = (c.shakha || '').trim();
          return cShakha === userShakhaName || 
                 cShakha.toLowerCase() === userCode.toLowerCase() ||
                 SHAKHA[cShakha] === userShakhaName ||
                 SHAKHA[cShakha.toUpperCase()] === userShakhaName;
        });
      } else if (state.currentUser && state.currentUser.role === 'mahashakha') {
        chartComplaints = chartComplaints.filter(c => c.mahashakha === state.currentUser.mahashakha || c.mahashakha === state.currentUser.name);
        
        // Apply Mahashakha Filter if selected
        const mahashakhaFilter = document.getElementById('mahashakhaFilterShakha');
        if (mahashakhaFilter && mahashakhaFilter.value) {
            chartComplaints = chartComplaints.filter(c => c.shakha === mahashakhaFilter.value);
        }
      }

      // Nepali Months (Baishakh to Chaitra)
      const nepaliMonths = ['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत'];
      const registeredData = new Array(12).fill(0);
      const resolvedData = new Array(12).fill(0);
      
      let currentNYear = 2081;
      try {
          const nDate = getCurrentNepaliDate();
          const parts = nDate.split('-');
          if(parts.length >= 1) {
             currentNYear = parseInt(parts[0]);
          }
      } catch(e) {}

      chartComplaints.forEach(c => {
              if (!c.date) return;
              // Try to parse date YYYY-MM-DD
              const dParts = c.date.split('-');
              if (dParts.length < 2) return;
              const cY = parseInt(dParts[0]);
              const cM = parseInt(dParts[1]);
              
              // Filter for current year and valid month
              if (cY === currentNYear && cM >= 1 && cM <= 12) {
                  registeredData[cM - 1]++;
                  if (c.status === 'resolved') resolvedData[cM - 1]++;
              }
      });
      
      window.nvcChartsData.trendChart = {
          labels: nepaliMonths,
          datasets: [
              {
                  label: 'दर्ता भएको',
                  data: registeredData,
                  backgroundColor: 'rgba(13, 71, 161, 0.8)',
                  borderColor: 'rgba(13, 71, 161, 1)',
                  borderWidth: 1
              },
              {
                  label: 'फछ्रयौट भएको',
                  data: resolvedData,
                  backgroundColor: 'rgba(46, 125, 50, 0.8)',
                  borderColor: 'rgba(46, 125, 50, 1)',
                  borderWidth: 1
              }
          ]
      };

      try {
        window.nvcCharts.trendChart = new Chart(trendCtx.getContext('2d'), {
          type: window.nvcChartsType.trendChart || 'bar',
          data: window.nvcChartsData.trendChart,
          options: {
            responsive: true, maintainAspectRatio: false,
            onClick: (evt, elements, chart) => {
                if (elements.length > 0) {
                    const i = elements[0].index;
                    const monthName = chart.data.labels[i];
                    // Pass monthIndex (1-based) for accurate filtering
                    showChartDrillDown({ monthIndex: i + 1, monthName: monthName }, `${monthName} महिनाका उजुरीहरू`);
                }
            },
            scales: { 
                y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
                x: { grid: { display: false } }
            },
            plugins: {
                tooltip: { mode: 'index', intersect: false },
                legend: { position: 'bottom' }
            }
          }
        });
      } catch (e) { console.error('❌ Error creating trend chart:', e); }
    }
    
    const projectCtx = document.getElementById('projectStatusChart');
    if (projectCtx) {
      if (window.nvcCharts.projectChart) window.nvcCharts.projectChart.destroy();
      
      let technicalProjects = state.projects || [];
      if (state.currentUser && state.currentUser.role !== 'admin') {
        const userShakhaName = (state.currentUser.shakha || '').trim();
        const userCode = (state.currentUser.id || '').trim();
        technicalProjects = technicalProjects.filter(p => {
          const pShakha = (p.shakha || '').trim();
          return pShakha === userShakhaName || 
                 pShakha.toLowerCase() === userCode.toLowerCase() ||
                 SHAKHA[pShakha] === userShakhaName ||
                 SHAKHA[pShakha.toUpperCase()] === userShakhaName;
        });
      }
      const active = technicalProjects.filter(p => p.status === 'active').length;
      const completed = technicalProjects.filter(p => p.status === 'completed').length;
      const pending = technicalProjects.filter(p => p.status === 'pending').length;
      
      window.nvcChartsData.projectChart = {
          labels: ['चालु', 'सम्पन्न', 'काम बाँकी'],
          datasets: [{
              data: [active, completed, pending],
              backgroundColor: ['rgba(30, 136, 229, 0.8)', 'rgba(46, 125, 50, 0.8)', 'rgba(255, 143, 0, 0.8)'],
              borderColor: ['rgba(30, 136, 229, 1)', 'rgba(46, 125, 50, 1)', 'rgba(255, 143, 0, 1)'],
              borderWidth: 1
          }]
      };

      try {
        window.nvcCharts.projectChart = new Chart(projectCtx.getContext('2d'), {
          type: window.nvcChartsType.projectChart || 'pie',
          data: window.nvcChartsData.projectChart,
          options: {
            responsive: true, maintainAspectRatio: false,
            onClick: (evt, elements, chart) => {
                if (elements.length > 0) {
                    const i = elements[0].index;
                    const label = chart.data.labels[i];
                    const statusMap = { 'चालु': 'active', 'सम्पन्न': 'completed', 'काम बाँकी': 'pending' };
                    // Note: Projects view doesn't have a simple filter function exposed like showComplaintsView
                    // So we just show a toast or navigate
                    showTechnicalProjectsView({ status: statusMap[label] });
                }
            },
            plugins: {
              legend: { position: 'bottom', labels: { font: { size: 11 } } },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.raw || 0;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                    return `${label}: ${value} (${percentage}%)`;
                  }
                }
              }
            }
          }
        });
      } catch (e) { console.error('❌ Error creating project chart:', e); }
    }
    
    const comparisonCtx = document.getElementById('shakhaComparisonChart');
    if (comparisonCtx) {
      if (window.nvcCharts.comparisonChart) window.nvcCharts.comparisonChart.destroy();
      
      const shakhaStats = {};
      let complaintsForChart = state.complaints || [];
      
      if (state.currentUser && state.currentUser.role === 'mahashakha') {
        complaintsForChart = complaintsForChart.filter(c => c.mahashakha === state.currentUser.mahashakha || c.mahashakha === state.currentUser.name);
        
        // Apply Mahashakha Filter if selected
        const mahashakhaFilter = document.getElementById('mahashakhaFilterShakha');
        if (mahashakhaFilter && mahashakhaFilter.value) {
            complaintsForChart = complaintsForChart.filter(c => c.shakha === mahashakhaFilter.value);
        }
      }

      complaintsForChart.forEach(complaint => {
        const shakha = complaint.shakha || 'अन्य';
        if (!shakhaStats[shakha]) shakhaStats[shakha] = { pending: 0, resolved: 0 };
        if (complaint.status === 'pending') shakhaStats[shakha].pending++;
        if (complaint.status === 'resolved') shakhaStats[shakha].resolved++;
      });
      
      const shakhas = Object.keys(shakhaStats);
      const pendingData = shakhas.map(shakha => shakhaStats[shakha].pending);
      const resolvedData = shakhas.map(shakha => shakhaStats[shakha].resolved);
      
      window.nvcChartsData.comparisonChart = {
          labels: shakhas,
          datasets: [
              { 
                label: 'काम बाँकी', 
                data: pendingData, 
                backgroundColor: 'rgba(255, 170, 0, 0.8)', 
                borderWidth: 0, borderRadius: 4
              },
              { 
                label: 'फछ्रयौट', 
                data: resolvedData, 
                backgroundColor: 'rgba(16, 185, 129, 0.8)', 
                borderWidth: 0, borderRadius: 4
              }
          ]
      };

      try {
        window.nvcCharts.comparisonChart = new Chart(comparisonCtx.getContext('2d'), {
          type: window.nvcChartsType.comparisonChart || 'bar',
          data: window.nvcChartsData.comparisonChart,
          options: {
            indexAxis: 'y', // Horizontal Layout
            responsive: true, maintainAspectRatio: false,
            barThickness: 15,
            maxBarThickness: 25,
            onClick: (evt, elements, chart) => {
                if (elements.length > 0) {
                    const i = elements[0].index;
                    const label = chart.data.labels[i];
                    showChartDrillDown({ shakha: label }, `${label} शाखाका उजुरीहरू`);
                }
            },
            scales: {
              x: { 
                beginAtZero: true, 
                grid: { color: '#f0f0f0', drawBorder: false },
                stacked: true 
              },
              y: { 
                grid: { display: false, drawBorder: false },
                stacked: true,
                ticks: { font: { size: 11 } }
              }
            },
            plugins: {
              legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } }
            }
          }
        });
      } catch (e) { console.error('❌ Error creating comparison chart:', e); }
    }

    const resolutionCtx = document.getElementById('resolutionRateChart');
    if (resolutionCtx) {
      if (window.nvcCharts.resolutionRateChart) window.nvcCharts.resolutionRateChart.destroy();
      
      const shakhaStats = {};
      (state.complaints || []).forEach(complaint => {
        const shakha = complaint.shakha || 'अन्य';
        if (!shakhaStats[shakha]) shakhaStats[shakha] = { total: 0, resolved: 0 };
        shakhaStats[shakha].total++;
        if (complaint.status === 'resolved') shakhaStats[shakha].resolved++;
      });
      
      const labels = Object.keys(shakhaStats);
      const data = labels.map(shakha => {
        const stats = shakhaStats[shakha];
        return stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
      });
      
      window.nvcChartsData.resolutionRateChart = {
          labels: labels,
          datasets: [{
              label: 'फछ्र्यौट दर (%)',
              data: data,
              backgroundColor: 'rgba(46, 125, 50, 0.7)',
              borderColor: 'rgba(46, 125, 50, 1)',
              borderWidth: 1
          }]
      };

      try {
        window.nvcCharts.resolutionRateChart = new Chart(resolutionCtx.getContext('2d'), {
          type: window.nvcChartsType.resolutionRateChart || 'bar',
          data: window.nvcChartsData.resolutionRateChart,
          options: {
            responsive: true, maintainAspectRatio: false,
            onClick: (evt, elements, chart) => {
                if (elements.length > 0) {
                    const i = elements[0].index;
                    const label = chart.data.labels[i];
                    showChartDrillDown({ shakha: label }, `${label} शाखाको विवरण`);
                }
            },
            scales: {
              y: { beginAtZero: true, max: 100, title: { display: true, text: 'प्रतिशत (%)' } },
              x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + '%';
                        }
                    }
                }
            }
          }
        });
      } catch (e) { console.error('❌ Error creating resolution rate chart:', e); }
    }

    // --- New Classification Chart ---
    const classificationCtx = document.getElementById('classificationChart');
    if (classificationCtx) {
      if (window.nvcCharts.classificationChart) window.nvcCharts.classificationChart.destroy();

      const classStats = {
        'भ्रष्टाचार': 0,
        'सार्वजनिक खरिद/ठेक्का': 0,
        'आर्थिक हिनामिना': 0,
        'पूर्वाधार निर्माण': 0,
        'सेवा प्रवाह': 0,
        'कर्मचारी आचरण': 0,
        'नीति/निर्णय प्रक्रिया': 0,
        'अन्य': 0
      };

      // Filter complaints based on role (same logic as other charts)
      let chartComplaints = state.complaints || [];
      if (state.currentUser && state.currentUser.role === 'shakha') {
        const userShakhaName = (state.currentUser.shakha || '').trim();
        const userCode = (state.currentUser.id || '').trim();
        chartComplaints = chartComplaints.filter(c => {
          const cShakha = (c.shakha || '').trim();
          return cShakha === userShakhaName || 
                 cShakha.toLowerCase() === userCode.toLowerCase() ||
                 SHAKHA[cShakha] === userShakhaName ||
                 SHAKHA[cShakha.toUpperCase()] === userShakhaName;
        });
      } else if (state.currentUser && state.currentUser.role === 'mahashakha') {
        chartComplaints = chartComplaints.filter(c => c.mahashakha === state.currentUser.mahashakha || c.mahashakha === state.currentUser.name);
        const mahashakhaFilter = document.getElementById('mahashakhaFilterShakha');
        if (mahashakhaFilter && mahashakhaFilter.value) {
            chartComplaints = chartComplaints.filter(c => c.shakha === mahashakhaFilter.value);
        }
      }

      chartComplaints.forEach(c => {
          const analysis = AI_SYSTEM.analyzeComplaint(c.description || '');
          const cls = analysis.classification || 'अन्य';
          if (classStats[cls] !== undefined) classStats[cls]++;
          else classStats['अन्य']++;
      });

      window.nvcChartsData.classificationChart = {
          labels: Object.keys(classStats),
          datasets: [{
              label: 'उजुरी संख्या',
              data: Object.values(classStats),
              backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#535353'],
              borderWidth: 1
          }]
      };

      try {
        window.nvcCharts.classificationChart = new Chart(classificationCtx.getContext('2d'), {
          type: window.nvcChartsType['classificationChart'] || window.nvcChartsType.classificationChart || 'doughnut',
          data: window.nvcChartsData.classificationChart,
          options: {
            responsive: true, maintainAspectRatio: false,
            onClick: (evt, elements, chart) => {
                if (elements.length > 0) {
                    const i = elements[0].index;
                    const label = chart.data.labels[i];
                    showChartDrillDown({ classification: label }, `${label} सम्बन्धी उजुरीहरू`);
                }
            },
            plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } }
          }
        });
      } catch (e) { console.error('❌ Error creating classification chart:', e); }
    }
  }, 300);
}

function showChartDrillDown(filters, title) {
    let filtered = state.complaints;
    
    if (filters.status) filtered = filtered.filter(c => c.status === filters.status);
    if (filters.shakha) filtered = filtered.filter(c => c.shakha === filters.shakha);
    
    if (filters.monthIndex) {
        filtered = filtered.filter(c => {
            if (!c.date) return false;
            const parts = c.date.split('-');
            if (parts.length >= 2) return parseInt(parts[1]) === filters.monthIndex;
            return false;
        });
    } else if (filters.month) {
        filtered = filtered.filter(c => (c.date || '').includes(filters.month));
    }

    if (filters.classification) {
        filtered = filtered.filter(c => {
            const analysis = AI_SYSTEM.analyzeComplaint(c.description || '');
            const cls = analysis.classification || 'अन्य';
            return cls === filters.classification;
        });
    }
    
    const tableRows = filtered.map(c => `
        <tr>
            <td>${c.id}</td>
            <td>${c.date}</td>
            <td>${c.complainant}</td>
            <td>${c.description.substring(0, 40)}...</td>
            <td><span class="status-badge status-${c.status}">${c.status === 'resolved' ? 'फछ्रयौट' : c.status === 'pending' ? 'बाँकी' : 'चालु'}</span></td>
            <td><button class="btn btn-sm btn-light action-btn" data-action="view" data-id="${c.id}" data-close="true"><i class="fas fa-eye"></i></button></td>
        </tr>
    `).join('');
    
    const content = `
        <div class="table-responsive">
            <table class="table table-sm table-hover">
                <thead><tr><th>ID</th><th>मिति</th><th>उजुरकर्ता</th><th>विवरण</th><th>स्थिति</th><th>कार्य</th></tr></thead>
                <tbody>${tableRows.length ? tableRows : '<tr><td colspan="6" class="text-center">डाटा छैन</td></tr>'}</tbody>
            </table>
        </div>
    `;
    
    openModal(title || 'विवरण', content);
}

function changeChartType(chartId, newType) {
    window.nvcChartsType[chartId] = newType;
    initializeDashboardCharts(); // Re-render all charts (simplest way to apply type change)
}

function exportChartImage(chartId) {
    const canvas = document.getElementById(chartId);
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${chartId}_${new Date().toISOString().slice(0,10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function exportChartData(chartId) {
    const data = window.nvcChartsData[chartId];
    if (!data) return;
    
    let csv = 'Label,Value\n';
    data.labels.forEach((label, i) => {
        // Handle multiple datasets by summing or listing all
        let val = 0;
        data.datasets.forEach(ds => {
            val += (ds.data[i] || 0);
        });
        csv += `"${label}",${val}\n`;
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${chartId}_data.csv`;
    link.click();
}

function showDashboardView() {
  state.currentView = 'dashboard';
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = 'ड्यासबोर्ड';
  
  destroyAllCharts();
  
  let content = '';
  if (state.currentUser.role === 'admin') content = showAdminDashboard();
  else if (state.currentUser.role === 'admin_planning') content = showAdminPlanningDashboard();
  else if (state.currentUser.role === 'mahashakha') content = showMahashakhaDashboard();
  else if (state.currentUser.permissions?.includes('technical_inspection')) content = showTechnicalDashboard();
  else content = showShakhaDashboard();
  
  const contentArea = document.getElementById('contentArea');
  if (contentArea) contentArea.innerHTML = content;
  
  // Render AI insights if it's an admin dashboard
  if (state.currentUser.role === 'admin') {
    renderAIInsights();
  }

  updateActiveNavItem();
  setTimeout(initializeDashboardCharts, 500);
}

function renderAIInsights() {
    const container = document.getElementById('aiInsightBox');
    if (!container) return;

    const insights = AI_INSIGHTS.generateInsights(state.complaints);
    
    if (!insights || insights.length === 0) {
        container.innerHTML = '';
        return;
    }

    const insightsHTML = insights.map(insight => `
        <div class="insight-item insight-${insight.type}">
            <i class="fas ${insight.icon}"></i>
            <span>${insight.message}</span>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="ai-insight-container card">
             <div class="card-header">
                <h6 class="mb-0"><span class="ai-badge"><i class="fas fa-robot"></i> AI इनसाइट</span> प्रणाली विश्लेषण</h6>
            </div>
            <div class="card-body">
                ${insightsHTML}
            </div>
        </div>
    `;
}

function getChartActionsHTML(chartId) {
  return `
    <div class="dropdown">
      <button class="btn btn-sm btn-link text-muted p-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        <i class="fas fa-ellipsis-v"></i>
      </button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><h6 class="dropdown-header">प्रकार परिवर्तन</h6></li>
        <li><a class="dropdown-item" href="#" onclick="changeChartType('${chartId}', 'bar')"><i class="fas fa-chart-bar me-2"></i> Bar</a></li>
        <li><a class="dropdown-item" href="#" onclick="changeChartType('${chartId}', 'line')"><i class="fas fa-chart-line me-2"></i> Line</a></li>
        <li><a class="dropdown-item" href="#" onclick="changeChartType('${chartId}', 'pie')"><i class="fas fa-chart-pie me-2"></i> Pie</a></li>
        <li><a class="dropdown-item" href="#" onclick="changeChartType('${chartId}', 'doughnut')"><i class="fas fa-circle-notch me-2"></i> Doughnut</a></li>
        <li><hr class="dropdown-divider"></li>
        <li><h6 class="dropdown-header">कार्यहरू</h6></li>
        <li><a class="dropdown-item" href="#" onclick="exportChartImage('${chartId}')"><i class="fas fa-image me-2"></i> PNG डाउनलोड</a></li>
        <li><a class="dropdown-item" href="#" onclick="exportChartData('${chartId}')"><i class="fas fa-file-csv me-2"></i> CSV डाउनलोड</a></li>
      </ul>
    </div>
  `;
}

function generateClassificationTableHTML(complaints) {
    const stats = {
        'भ्रष्टाचार': 0, 'सार्वजनिक खरिद/ठेक्का': 0, 'आर्थिक हिनामिना': 0, 'पूर्वाधार निर्माण': 0,
        'सेवा प्रवाह': 0, 'कर्मचारी आचरण': 0, 'नीति/निर्णय प्रक्रिया': 0, 'अन्य': 0
    };

    complaints.forEach(c => {
        const analysis = AI_SYSTEM.analyzeComplaint(c.description || '');
        const cls = analysis.classification || 'अन्य';
        if (stats[cls] !== undefined) stats[cls]++;
        else stats['अन्य'] = (stats['अन्य'] || 0) + 1;
    });

    const rows = Object.entries(stats).map(([key, value]) => `
        <tr><td>${key}</td><td class="text-end">${value}</td></tr>
    `).join('');

    return `
        <div class="table-responsive">
            <table class="table table-sm table-bordered mb-0">
                <thead class="table-light">
                    <tr><th>वर्गीकरण (विषय)</th><th class="text-end">संख्या</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

function showAdminDashboard() {
  const totalComplaints = state.complaints.length;
  const pendingComplaints = state.complaints.filter(c => c.status === 'pending').length;
  const resolvedComplaints = state.complaints.filter(c => c.status === 'resolved').length;
  const monthlyComplaints = state.complaints.filter(c => {
    const today = new Date();
    const complaintDate = new Date(c.date);
    return complaintDate.getMonth() === today.getMonth() && 
           complaintDate.getFullYear() === today.getFullYear();
  }).length;
  
  const shakhaStats = {};
  state.complaints.forEach(complaint => {
    const shakha = complaint.shakha || 'अन्य';
    if (!shakhaStats[shakha]) shakhaStats[shakha] = { total: 0, pending: 0, resolved: 0 };
    shakhaStats[shakha].total++;
    if (complaint.status === 'pending') shakhaStats[shakha].pending++;
    if (complaint.status === 'resolved') shakhaStats[shakha].resolved++;
  });
  
  return `
    <div class="search-bar-container mb-3">
        <div class="input-group">
            <span class="input-group-text bg-white"><i class="fas fa-search text-muted"></i></span>
            <input type="text" class="form-control border-start-0 ps-0" placeholder="उजुरी नं, नाम वा विवरण खोजी गर्नुहोस्..." onkeyup="if(event.key === 'Enter') showComplaintsView({search: this.value})">
            <button class="btn btn-primary" onclick="showComplaintsView({search: this.previousElementSibling.value})">खोजी गर्नुहोस्</button>
        </div>
    </div>

    <div id="aiInsightBox" class="mb-3"></div>
    
    <div class="card mb-3">
      <div class="card-header d-flex justify-between align-center">
        <h6 class="mb-0">🔥 हटस्पट ट्र्याकर</h6>
        <a href="#" class="text-primary" onclick="showHotspotMap()">पूर्ण नक्सा हेर्नुहोस्</a>
      </div>
      <div class="card-body">
        <div class="d-flex gap-3 overflow-auto" style="padding-bottom: 8px;">
          ${generateHotspotCards()}
        </div>
      </div>
    </div>
  

    <div class="stats-grid mb-3">
      <div class="stat-widget pointer" onclick="showComplaintsView()"><div class="stat-icon bg-primary"><i class="fas fa-file-alt"></i></div><div class="stat-info"><div class="stat-value">${totalComplaints}</div><div class="stat-label">कूल उजुरीहरू</div><span class="stat-trend trend-up"></span></div></div>
      <div class="stat-widget pointer" onclick="showComplaintsView({status: 'pending'})"><div class="stat-icon bg-warning"><i class="fas fa-clock"></i></div><div class="stat-info"><div class="stat-value">${pendingComplaints}</div><div class="stat-label">काम बाँकी</div><span class="stat-trend trend-down"></span></div></div>
      <div class="stat-widget pointer" onclick="showComplaintsView({status: 'resolved'})"><div class="stat-icon bg-success"><i class="fas fa-check-circle"></i></div><div class="stat-info"><div class="stat-value">${resolvedComplaints}</div><div class="stat-label">फछ्रयौट भएका</div><span class="stat-trend trend-up"></span></div></div>
      <div class="stat-widget pointer" onclick="showComplaintsView()"><div class="stat-icon bg-secondary"><i class="fas fa-calendar-alt"></i></div><div class="stat-info"><div class="stat-value">${monthlyComplaints}</div><div class="stat-label">यस महिनाका</div><span class="stat-trend trend-up"></span></div></div>
    </div>
    
    <div class="card mb-3">
      <div class="card-header d-flex justify-between align-center"><h5 class="mb-0">उजुरी वर्गीकरण (AI विश्लेषण)</h5>${getChartActionsHTML('classificationChart')}</div>
      <div class="card-body">
        <div class="row"><div class="col-md-7"><div class="chart-wrapper dashboard-chart-wrapper"><canvas id="classificationChart"></canvas></div></div><div class="col-md-5">${generateClassificationTableHTML(state.complaints)}</div></div>
      </div>
    </div>

    <div class="d-grid gap-3 mb-3" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
      <div class="chart-container"><div class="chart-header d-flex justify-between align-center"><h6 class="chart-title">शाखा अनुसार उजुरी तुलना</h6>${getChartActionsHTML('shakhaChart')}</div><div class="chart-wrapper dashboard-chart-wrapper"><canvas id="shakhaChart"></canvas></div></div>
      <div class="chart-container"><div class="chart-header d-flex justify-between align-center"><h6 class="chart-title">मासिक प्रगति विवरण</h6>${getChartActionsHTML('trendChart')}</div><div class="chart-wrapper dashboard-chart-wrapper"><canvas id="trendChart"></canvas></div></div>
      <div class="chart-container"><div class="chart-header d-flex justify-between align-center"><h6 class="chart-title">शाखा अनुसार फछ्र्यौट दर</h6>${getChartActionsHTML('resolutionRateChart')}</div><div class="chart-wrapper dashboard-chart-wrapper"><canvas id="resolutionRateChart"></canvas></div></div>
    </div>
    
    <div class="card mb-3">
      <div class="card-header d-flex justify-between align-center">
        <h5 class="mb-0">शाखा अनुसार उजुरी स्थिति</h5>
        <button class="btn btn-sm btn-success" onclick="exportToExcel('shakha_stats')"><i class="fas fa-file-excel"></i> Excel</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>शाखा</th><th>कूल उजुरी</th><th>काम बाँकी</th><th>फछ्रयौट</th><th>फछ्रयौट दर</th></tr></thead>
            <tbody>
              ${Object.keys(shakhaStats).map(shakha => {
                const stats = shakhaStats[shakha];
                const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;                return `<tr><td data-label="शाखा">${shakha}</td><td data-label="कूल उजुरी">${stats.total}</td><td data-label="काम बाँकी">${stats.pending}</td><td data-label="फछ्रयौट">${stats.resolved}</td><td data-label="फछ्रयौट दर">${resolutionRate}%</td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-header d-flex justify-between align-center">
        <h5 class="mb-0">हालैका उजुरीहरू</h5>
        <div class="d-flex align-center gap-2">
          <button class="btn btn-sm btn-success" onclick="exportToExcel('recent')"><i class="fas fa-file-excel"></i> Excel</button>
          <a href="#" class="text-primary text-small" onclick="showAllComplaintsView()">सबै हेर्नुहोस्</a>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>दर्ता नं</th><th>दर्ता मिति</th><th>उजुरकर्ता</th><th>सम्बन्धित शाखा</th><th>उजुरीको संक्षिप्त विवरण</th><th>उजुरीको स्थिति</th><th>कार्य</th></tr></thead>
            <tbody>
              ${state.complaints.slice(0, 5).map(complaint => `
                <tr>
                  <td data-label="दर्ता नं">${complaint.id}</td><td data-label="दर्ता मिति">${complaint.date}</td><td data-label="उजुरकर्ता">${complaint.complainant}</td><td data-label="सम्बन्धित शाखा">${complaint.shakha || '-'}</td>
                  <td data-label="उजुरीको संक्षिप्त विवरण" class="text-limit">${(complaint.description || '').substring(0, 50)}...</td>
                  <td data-label="उजुरीको स्थिति"><span class="status-badge ${complaint.status === 'resolved' ? 'status-resolved' : complaint.status === 'pending' ? 'status-pending' : 'status-progress'}">${complaint.status === 'resolved' ? 'फछ्रयौट' : complaint.status === 'pending' ? 'काम बाँकी' : 'चालु'}</span></td>
                  <td data-label="कार्य"><button class="action-btn" data-action="view" data-id="${complaint.id}" title="हेर्नुहोस्"><i class="fas fa-eye"></i></button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function showAdminPlanningDashboard() {
  const helloSarkarComplaints = state.complaints.filter(c => c.source === 'hello_sarkar');
  const pendingHelloSarkar = helloSarkarComplaints.filter(c => c.status === 'pending').length;
  
  return `
    <div class="search-bar-container mb-3">
        <div class="input-group">
            <span class="input-group-text bg-white"><i class="fas fa-search text-muted"></i></span>
            <input type="text" class="form-control border-start-0 ps-0" placeholder="उजुरी नं, नाम वा विवरण खोजी गर्नुहोस्..." onkeyup="if(event.key === 'Enter') showAdminComplaintsView({search: this.value})">
            <button class="btn btn-primary" onclick="showAdminComplaintsView({search: this.previousElementSibling.value})">खोजी गर्नुहोस्</button>
        </div>
    </div>

    <div class="stats-grid mb-3">
      <div class="stat-widget pointer" onclick="showAdminComplaintsView()"><div class="stat-icon bg-primary"><i class="fas fa-file-alt"></i></div><div class="stat-info"><div class="stat-value">${helloSarkarComplaints.length}</div><div class="stat-label">हेलो सरकारबाट प्राप्त उजुरी</div><span class="stat-trend trend-up"></span></div></div>
      <div class="stat-widget pointer" onclick="showAdminComplaintsView({status: 'pending'})"><div class="stat-icon bg-warning"><i class="fas fa-clock"></i></div><div class="stat-info"><div class="stat-value">${pendingHelloSarkar}</div><div class="stat-label">काम बाँकी</div><span class="stat-trend trend-down"></span></div></div>
      <div class="stat-widget pointer" onclick="showEmployeeMonitoringView()"><div class="stat-icon bg-success"><i class="fas fa-user-check"></i></div><div class="stat-info"><div class="stat-value"></div><div class="stat-label">अनुगमन गरिएका</div><span class="stat-trend trend-up"></span></div></div>
      <div class="stat-widget pointer" onclick="showAdminComplaintsView()"><div class="stat-icon bg-secondary"><i class="fas fa-chart-line"></i></div><div class="stat-info"><div class="stat-value"></div><div class="stat-label">समयमा प्रतिक्रिया</div><span class="stat-trend trend-up"></span></div></div>
    </div>
    
    <div class="d-grid gap-3 mb-3" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
      <div class="card"><div class="card-header"><h6 class="mb-0">हेलो सरकारबाट प्राप्त उजुरी</h6></div><div class="card-body"><div class="d-flex justify-between align-center mb-2"><span class="text-small">कूल उजुरी</span><span class="font-weight-bold">${helloSarkarComplaints.length}</span></div><div class="d-flex justify-between align-center mb-2"><span class="text-small">काम बाँकी</span><span class="font-weight-bold text-warning">${pendingHelloSarkar}</span></div><div class="d-flex justify-between align-center"><span class="text-small">फछ्रयौट</span><span class="font-weight-bold text-success">${helloSarkarComplaints.length - pendingHelloSarkar}</span></div></div></div>
      <div class="card"><div class="card-header"><h6 class="mb-0">कार्यालय अनुगमन</h6></div><div class="card-body"><div class="d-flex justify-between align-center mb-2"><span class="text-small">आजको अनुगमन</span><span class="font-weight-bold"></span></div><div class="d-flex justify-between align-center mb-2"><span class="text-small">पोशाक अपरिपालना</span><span class="font-weight-bold text-warning">३</span></div><div class="d-flex justify-between align-center"><span class="text-small">समय अपरिपालना</span><span class="font-weight-bold text-danger">२</span></div></div></div>
    </div>
    
    <div class="card">
      <div class="card-header d-flex justify-between align-center">
        <h5 class="mb-0">हालैका हेलो सरकारबाट प्राप्त उजुरीहरू</h5>
        <button class="btn btn-sm btn-primary" onclick="showAdminComplaintsView()">सबै हेर्नुहोस्</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>क्र.सं.</th><th>प्राप्त मिति</th><th>उजुरकर्ता</th><th>विपक्षी</th><th>उजुरीको संक्षिप्त विवरण</th><th>सम्बन्धित शाखा</th><th>उजुरीको स्थिति</th></tr></thead>
            <tbody>
              ${helloSarkarComplaints.slice(0, 5).map((complaint, index) => `
                <tr>
                  <td data-label="क्र.सं.">${index + 1}</td><td data-label="प्राप्त मिति">${complaint.date}</td><td data-label="उजुरकर्ता">${complaint.complainant}</td><td data-label="विपक्षी">${complaint.accused || '-'}</td>
                  <td data-label="उजुरीको संक्षिप्त विवरण" class="text-limit">${(complaint.description || '').substring(0, 50)}...</td><td data-label="सम्बन्धित शाखा">${complaint.assignedShakha || '-'}</td>
                  <td data-label="उजुरीको स्थिति"><span class="status-badge ${complaint.status === 'resolved' ? 'status-resolved' : complaint.status === 'pending' ? 'status-pending' : 'status-progress'}">${complaint.status === 'resolved' ? 'फछ्रयौट' : complaint.status === 'pending' ? 'काम बाँकी' : 'चालु'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function showMahashakhaDashboard() {
  // Filter complaints for this Mahashakha
  const mahashakhaComplaints = state.complaints.filter(c => c.mahashakha === state.currentUser.mahashakha || c.mahashakha === state.currentUser.name);
  
  const totalComplaints = mahashakhaComplaints.length;
  const pendingComplaints = mahashakhaComplaints.filter(c => c.status === 'pending').length;
  const resolvedComplaints = mahashakhaComplaints.filter(c => c.status === 'resolved').length;
  const monthlyComplaints = mahashakhaComplaints.filter(c => {
    const today = new Date();
    const complaintDate = new Date(c.date);
    return complaintDate.getMonth() === today.getMonth() && 
           complaintDate.getFullYear() === today.getFullYear();
  }).length;
  
  // Group by Shakha
  const shakhaStats = {};
  mahashakhaComplaints.forEach(complaint => {
    const shakha = complaint.shakha || 'अन्य';
    if (!shakhaStats[shakha]) shakhaStats[shakha] = { total: 0, pending: 0, resolved: 0 };
    shakhaStats[shakha].total++;
    if (complaint.status === 'pending') shakhaStats[shakha].pending++;
    if (complaint.status === 'resolved') shakhaStats[shakha].resolved++;
  });

  // Generate Shakha Options for Filter
  const myShakhas = MAHASHAKHA_STRUCTURE[state.currentUser.mahashakha] || [];
  const shakhaOptions = myShakhas.map(s => `<option value="${s}">${s}</option>`).join('');

  return `
    <div class="search-bar-container mb-3 d-flex gap-2 flex-wrap">
        <div class="input-group flex-grow-1">
            <span class="input-group-text bg-white"><i class="fas fa-search text-muted"></i></span>
            <input type="text" class="form-control border-start-0 ps-0" placeholder="उजुरी नं, नाम वा विवरण खोजी गर्नुहोस्..." onkeyup="if(event.key === 'Enter') showComplaintsView({search: this.value})">
            <button class="btn btn-primary" onclick="showComplaintsView({search: this.previousElementSibling.value})">खोजी गर्नुहोस्</button>
        </div>
        <select class="form-select" style="max-width: 250px;" id="mahashakhaFilterShakha" onchange="filterMahashakhaDashboard()">
            <option value="">सबै शाखाहरु</option>
            ${shakhaOptions}
        </select>
        <button class="btn excel-export-btn" onclick="exportMahashakhaData()"><i class="fas fa-file-excel"></i> Excel</button>
    </div>

    <div class="stats-grid mb-3">
      <div class="stat-widget pointer" onclick="showComplaintsView()"><div class="stat-icon bg-primary"><i class="fas fa-file-alt"></i></div><div class="stat-info"><div class="stat-value" id="mahashakhaTotal">${totalComplaints}</div><div class="stat-label">कूल उजुरी</div><span class="stat-trend trend-up"></span></div></div>
      <div class="stat-widget pointer" onclick="showComplaintsView({status: 'pending'})"><div class="stat-icon bg-warning"><i class="fas fa-clock"></i></div><div class="stat-info"><div class="stat-value" id="mahashakhaPending">${pendingComplaints}</div><div class="stat-label">काम बाँकी</div><span class="stat-trend trend-down"></span></div></div>
      <div class="stat-widget pointer" onclick="showComplaintsView({status: 'resolved'})"><div class="stat-icon bg-success"><i class="fas fa-check-circle"></i></div><div class="stat-info"><div class="stat-value" id="mahashakhaResolved">${resolvedComplaints}</div><div class="stat-label">फछ्रयौट भएका</div><span class="stat-trend trend-up"></span></div></div>
      <div class="stat-widget pointer" onclick="showComplaintsView()"><div class="stat-icon bg-secondary"><i class="fas fa-calendar-alt"></i></div><div class="stat-info"><div class="stat-value">${monthlyComplaints}</div><div class="stat-label">यस महिनाका</div><span class="stat-trend trend-up"></span></div></div>
    </div>
    
    <div class="card mb-3">
      <div class="card-header d-flex justify-between align-center"><h5 class="mb-0">उजुरी वर्गीकरण (AI विश्लेषण)</h5>${getChartActionsHTML('classificationChart')}</div>
      <div class="card-body">
        <div class="row"><div class="col-md-7"><div class="chart-wrapper dashboard-chart-wrapper"><canvas id="classificationChart"></canvas></div></div><div class="col-md-5">${generateClassificationTableHTML(mahashakhaComplaints)}</div></div>
      </div>
    </div>

    <div class="d-grid gap-3 mb-3" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
      <div class="chart-container"><div class="chart-header d-flex justify-between align-center"><h6 class="chart-title">शाखा अनुसार तुलना</h6>${getChartActionsHTML('shakhaComparisonChart')}</div><div class="chart-wrapper dashboard-chart-wrapper"><canvas id="shakhaComparisonChart"></canvas></div></div>
      <div class="chart-container"><div class="chart-header d-flex justify-between align-center"><h6 class="chart-title">मासिक प्रगति विवरण</h6>${getChartActionsHTML('trendChart')}</div><div class="chart-wrapper dashboard-chart-wrapper"><canvas id="trendChart"></canvas></div></div>
      <div class="chart-container"><div class="chart-header d-flex justify-between align-center"><h6 class="chart-title">शाखा अनुसार फछ्र्यौट दर</h6>${getChartActionsHTML('resolutionRateChart')}</div><div class="chart-wrapper dashboard-chart-wrapper"><canvas id="resolutionRateChart"></canvas></div></div>
    </div>
    
    <div class="card mb-3">
      <div class="card-header d-flex justify-between align-center">
        <h5 class="mb-0">शाखागत विवरण</h5>
        <button class="btn btn-sm btn-success" onclick="exportToExcel('shakha_stats')"><i class="fas fa-file-excel"></i> Excel</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>शाखा</th><th>कूल</th><th>बाँकी</th><th>फछ्रयौट</th><th>फछ्रयौट दर</th></tr></thead>
            <tbody>
              ${Object.keys(shakhaStats).map(shakha => {
                const stats = shakhaStats[shakha];
                const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
                return `<tr class="pointer" onclick="viewShakhaDetails('${shakha}')" title="विस्तृत विवरण हेर्न क्लिक गर्नुहोस्"><td data-label="शाखा">${shakha}</td><td data-label="कूल">${stats.total}</td><td data-label="बाँकी">${stats.pending}</td><td data-label="फछ्रयौट">${stats.resolved}</td><td data-label="फछ्रयौट दर">${resolutionRate}%</td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header d-flex justify-between align-center">
        <h5 class="mb-0">हालैका उजुरीहरू</h5>
        <div class="d-flex align-center gap-2">
          <button class="btn btn-sm btn-success" onclick="exportToExcel('recent')"><i class="fas fa-file-excel"></i> Excel</button>
          <a href="#" class="text-primary text-small" onclick="showComplaintsView()">सबै हेर्नुहोस्</a>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>दर्ता नं</th><th>दर्ता मिति</th><th>उजुरकर्ता</th><th>सम्बन्धित शाखा</th><th>उजुरीको संक्षिप्त विवरण</th><th>उजुरीको स्थिति</th><th>कार्य</th></tr></thead>
            <tbody>
              ${mahashakhaComplaints.slice(0, 5).map(complaint => `
                <tr>
                  <td data-label="दर्ता नं">${complaint.id}</td><td data-label="दर्ता मिति">${complaint.date}</td><td data-label="उजुरकर्ता">${complaint.complainant}</td><td data-label="सम्बन्धित शाखा">${complaint.shakha || '-'}</td>
                  <td data-label="उजुरीको संक्षिप्त विवरण" class="text-limit">${(complaint.description || '').substring(0, 50)}...</td>
                  <td data-label="उजुरीको स्थिति"><span class="status-badge ${complaint.status === 'resolved' ? 'status-resolved' : complaint.status === 'pending' ? 'status-pending' : 'status-progress'}">${complaint.status === 'resolved' ? 'फछ्रयौट' : complaint.status === 'pending' ? 'काम बाँकी' : 'चालु'}</span></td>
                  <td data-label="कार्य"><button class="action-btn" data-action="view" data-id="${complaint.id}" title="हेर्नुहोस्"><i class="fas fa-eye"></i></button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function filterMahashakhaDashboard() {
  const selectedShakha = document.getElementById('mahashakhaFilterShakha').value;
  
  // Filter complaints
  let filtered = state.complaints.filter(c => c.mahashakha === state.currentUser.mahashakha || c.mahashakha === state.currentUser.name);
  
  if (selectedShakha) {
    filtered = filtered.filter(c => c.shakha === selectedShakha);
  }
  
  // Update Stats
  const total = filtered.length;
  const pending = filtered.filter(c => c.status === 'pending').length;
  const resolved = filtered.filter(c => c.status === 'resolved').length;
  
  const totalEl = document.getElementById('mahashakhaTotal');
  const pendingEl = document.getElementById('mahashakhaPending');
  const resolvedEl = document.getElementById('mahashakhaResolved');
  
  if (totalEl) totalEl.textContent = total;
  if (pendingEl) pendingEl.textContent = pending;
  if (resolvedEl) resolvedEl.textContent = resolved;
  
  // Update Charts
  destroyAllCharts();
  initializeDashboardCharts();
}

function exportMahashakhaData() {
  console.log('📊 Exporting Mahashakha data...');
  
  const selectedShakha = document.getElementById('mahashakhaFilterShakha')?.value;
  
  // Filter complaints based on Mahashakha and selected Shakha
  let filteredData = state.complaints.filter(c => c.mahashakha === state.currentUser.mahashakha || c.mahashakha === state.currentUser.name);
  
  if (selectedShakha) {
    filteredData = filteredData.filter(c => c.shakha === selectedShakha);
  }

  if (filteredData.length === 0) {
    showToast('एक्स्पोर्ट गर्न कुनै डाटा छैन।', 'warning');
    return;
  }

  // Prepare data for export (select and rename columns)
  const dataToExport = filteredData.map(c => ({
    'दर्ता नं': c.id,
    'दर्ता मिति': c.date,
    'उजुरकर्ता': c.complainant,
    'विपक्षी': c.accused,
    'विवरण': c.description,
    'शाखा': c.shakha,
    'स्थिति': c.status,
    'कैफियत': c.remarks
  }));

  // Generate report name
  const mahashakhaName = (state.currentUser.mahashakha || 'Mahashakha').replace(/\s/g, '_');
  const shakhaName = selectedShakha ? `_${selectedShakha.replace(/\s/g, '_')}` : '_All_Shakhas';
  const reportName = `Report_${mahashakhaName}${shakhaName}_${new Date().toISOString().slice(0, 10)}`;

  // Call the generic export function
  exportReportToExcel(dataToExport, reportName);
}

function showTechnicalDashboard() {
  // शाखा अनुसार फिल्टर
  let shakhaComplaints = state.complaints;
  if (state.currentUser && state.currentUser.role !== 'admin') {
    const userShakhaName = (state.currentUser.shakha || '').trim();
    const userCode = (state.currentUser.id || '').trim();
    shakhaComplaints = shakhaComplaints.filter(c => {
      const cShakha = (c.shakha || '').trim();
      return cShakha === userShakhaName || 
             cShakha.toLowerCase() === userCode.toLowerCase() ||
             SHAKHA[cShakha] === userShakhaName ||
             SHAKHA[cShakha.toUpperCase()] === userShakhaName;
    });
  }
  const pendingComplaints = shakhaComplaints.filter(c => c.status === 'pending').length;
  
  let technicalProjects = state.projects;
  if (state.currentUser && state.currentUser.role !== 'admin') {
    const userShakhaName = (state.currentUser.shakha || '').trim();
    const userCode = (state.currentUser.id || '').trim();
    technicalProjects = technicalProjects.filter(p => {
      const pShakha = (p.shakha || '').trim();
      return pShakha === userShakhaName || 
             pShakha.toLowerCase() === userCode.toLowerCase() ||
             SHAKHA[pShakha] === userShakhaName ||
             SHAKHA[pShakha.toUpperCase()] === userShakhaName;
    });
  }
  const activeProjects = technicalProjects.filter(p => p.status === 'active').length;
  
  return `
    <div class="search-bar-container mb-3">
        <div class="input-group">
            <span class="input-group-text bg-white"><i class="fas fa-search text-muted"></i></span>
            <input type="text" class="form-control border-start-0 ps-0" placeholder="उजुरी नं, नाम वा विवरण खोजी गर्नुहोस्..." onkeyup="if(event.key === 'Enter') showComplaintsView({search: this.value})">
            <button class="btn btn-primary" onclick="showComplaintsView({search: this.previousElementSibling.value})">खोजी गर्नुहोस्</button>
        </div>
    </div>

    <div class="stats-grid mb-3">
      <div class="stat-widget pointer" onclick="showComplaintsView()"><div class="stat-icon bg-primary"><i class="fas fa-file-alt"></i></div><div class="stat-info"><div class="stat-value">${shakhaComplaints.length}</div><div class="stat-label">कूल उजुरी</div><span class="stat-trend trend-up"></span></div></div>
      <div class="stat-widget pointer" onclick="showComplaintsView({status: 'pending'})"><div class="stat-icon bg-warning"><i class="fas fa-clock"></i></div><div class="stat-info"><div class="stat-value">${pendingComplaints}</div><div class="stat-label">काम बाँकी</div><span class="stat-trend trend-down"></span></div></div>
      <div class="stat-widget pointer" onclick="showTechnicalProjectsView()"><div class="stat-icon bg-success"><i class="fas fa-hard-hat"></i></div><div class="stat-info"><div class="stat-value">${technicalProjects.length}</div><div class="stat-label">प्राविधिक परीक्षण/आयोजना अनुगमन</div><span class="stat-trend trend-up"></span></div></div>
      <div class="stat-widget pointer" onclick="showTechnicalProjectsView({status: 'active'})"><div class="stat-icon bg-secondary"><i class="fas fa-tasks"></i></div><div class="stat-info"><div class="stat-value">${activeProjects}</div><div class="stat-label">चालु आयोजना</div><span class="stat-trend trend-up"></span></div></div>
    </div>
    
    <div class="card mb-3">
      <div class="card-header d-flex justify-between align-center"><h5 class="mb-0">उजुरी वर्गीकरण (AI विश्लेषण)</h5>${getChartActionsHTML('classificationChart')}</div>
      <div class="card-body">
        <div class="row"><div class="col-md-7"><div class="chart-wrapper dashboard-chart-wrapper"><canvas id="classificationChart"></canvas></div></div><div class="col-md-5">${generateClassificationTableHTML(shakhaComplaints)}</div></div>
      </div>
    </div>

    <div class="d-grid gap-3 mb-3" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
      <div class="card"><div class="card-header d-flex justify-between align-center"><h6 class="mb-0">उजुरी स्थिति</h6>${getChartActionsHTML('complaintStatusChart')}</div><div class="card-body"><canvas id="complaintStatusChart"></canvas></div></div>
      <div class="card"><div class="card-header d-flex justify-between align-center"><h6 class="mb-0">प्राविधिक परीक्षण/आयोजना अनुगमन</h6>${getChartActionsHTML('projectStatusChart')}</div><div class="card-body"><canvas id="projectStatusChart"></canvas></div></div>
    </div>
    
    <div class="d-grid gap-3 mb-3" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
      <div class="card">
        <div class="card-header d-flex justify-between align-center">
          <h6 class="mb-0">हालैका उजुरीहरू</h6>
          <a href="#" class="text-primary text-small" onclick="showComplaintsView()">सबै हेर्नुहोस्</a>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-compact">
              <thead><tr><th>दर्ता नं</th><th>दर्ता मिति</th><th>उजुरकर्ता</th><th>उजुरीको स्थिति</th></tr></thead>
              <tbody>
                ${shakhaComplaints.slice(0, 5).map(complaint => `
                  <tr><td data-label="दर्ता नं">${complaint.id}</td><td data-label="दर्ता मिति">${complaint.date}</td><td data-label="उजुरकर्ता">${complaint.complainant}</td><td data-label="उजुरीको स्थिति"><span class="status-badge ${complaint.status === 'resolved' ? 'status-resolved' : complaint.status === 'pending' ? 'status-pending' : 'status-progress'}">${complaint.status === 'resolved' ? 'फछ्रयौट' : complaint.status === 'pending' ? 'काम बाँकी' : 'चालु'}</span></td></tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header d-flex justify-between align-center">
          <h6 class="mb-0">चालु आयोजनाहरू</h6>
          <a href="#" class="text-primary text-small" onclick="showTechnicalProjectsView()">सबै हेर्नुहोस्</a>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-compact">
              <thead><tr><th>आयोजनाको नाम</th><th>सम्बन्धित निकाय</th><th>अवस्था</th></tr></thead>
              <tbody>
                ${technicalProjects.slice(0, 5).map(project => `
                  <tr><td data-label="आयोजनाको नाम">${project.name}</td><td data-label="सम्बन्धित निकाय">${project.organization}</td><td data-label="अवस्था"><span class="status-badge ${project.status === 'active' ? 'status-progress' : 'status-resolved'}">${project.status === 'active' ? 'चालु' : 'सम्पन्न'}</span></td></tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

function showShakhaDashboard() {
  // शाखा अनुसार फिल्टर
  let shakhaComplaints = state.complaints;
  if (state.currentUser && state.currentUser.role !== 'admin') {
    const userShakhaName = (state.currentUser.shakha || '').trim();
    const userCode = (state.currentUser.id || '').trim();
    shakhaComplaints = shakhaComplaints.filter(c => {
      const cShakha = (c.shakha || '').trim();
      return cShakha === userShakhaName || 
             cShakha.toLowerCase() === userCode.toLowerCase() ||
             SHAKHA[cShakha] === userShakhaName ||
             SHAKHA[cShakha.toUpperCase()] === userShakhaName;
    });
  }
  const pendingComplaints = shakhaComplaints.filter(c => c.status === 'pending').length;
  const resolvedComplaints = shakhaComplaints.filter(c => c.status === 'resolved').length;
  const monthlyComplaints = shakhaComplaints.filter(c => {
    const today = new Date();
    const complaintDate = new Date(c.date);
    return complaintDate.getMonth() === today.getMonth() && 
           complaintDate.getFullYear() === today.getFullYear();
  }).length;
  
  return `
    <div class="search-bar-container mb-3">
        <div class="input-group">
            <span class="input-group-text bg-white"><i class="fas fa-search text-muted"></i></span>
            <input type="text" class="form-control border-start-0 ps-0" placeholder="उजुरी नं, नाम वा विवरण खोजी गर्नुहोस्..." onkeyup="if(event.key === 'Enter') showComplaintsView({search: this.value})">
            <button class="btn btn-primary" onclick="showComplaintsView({search: this.previousElementSibling.value})">खोजी गर्नुहोस्</button>
        </div>
    </div>

    <div class="stats-grid mb-3">
      <div class="stat-widget pointer" onclick="showComplaintsView()"><div class="stat-icon bg-primary"><i class="fas fa-file-alt"></i></div><div class="stat-info"><div class="stat-value">${shakhaComplaints.length}</div><div class="stat-label">कूल उजुरीहरू</div><span class="stat-trend trend-up"></span></div></div>
      <div class="stat-widget pointer" onclick="showComplaintsView({status: 'pending'})"><div class="stat-icon bg-warning"><i class="fas fa-clock"></i></div><div class="stat-info"><div class="stat-value">${pendingComplaints}</div><div class="stat-label">काम बाँकी</div><span class="stat-trend trend-down"></span></div></div>
      <div class="stat-widget pointer" onclick="showComplaintsView({status: 'resolved'})"><div class="stat-icon bg-success"><i class="fas fa-check-circle"></i></div><div class="stat-info"><div class="stat-value">${resolvedComplaints}</div><div class="stat-label">फछ्रयौट भएका</div><span class="stat-trend trend-up"></span></div></div>
      <div class="stat-widget pointer" onclick="showComplaintsView()"><div class="stat-icon bg-secondary"><i class="fas fa-calendar-alt"></i></div><div class="stat-info"><div class="stat-value">${monthlyComplaints}</div><div class="stat-label">यस महिनाका</div><span class="stat-trend trend-up"></span></div></div>
    </div>
    
    <div class="card mb-3">
      <div class="card-header d-flex justify-between align-center"><h5 class="mb-0">उजुरी वर्गीकरण (AI विश्लेषण)</h5>${getChartActionsHTML('classificationChart')}</div>
      <div class="card-body">
        <div class="row"><div class="col-md-7"><div class="chart-wrapper dashboard-chart-wrapper"><canvas id="classificationChart"></canvas></div></div><div class="col-md-5">${generateClassificationTableHTML(shakhaComplaints)}</div></div>
      </div>
    </div>

    <div class="d-grid gap-3 mb-3" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
      <div class="chart-container"><div class="chart-header d-flex justify-between align-center"><h6 class="chart-title">उजुरी स्थिति</h6>${getChartActionsHTML('complaintStatusChart')}</div><div class="chart-wrapper"><canvas id="complaintStatusChart"></canvas></div></div>
      <div class="chart-container"><div class="chart-header d-flex justify-between align-center"><h6 class="chart-title">मासिक प्रगति विवरण</h6>${getChartActionsHTML('trendChart')}</div><div class="chart-wrapper"><canvas id="trendChart"></canvas></div></div>
    </div>
    
    <div class="card">
      <div class="card-header d-flex justify-between align-center">
        <h5 class="mb-0">हालैका उजुरीहरू</h5>
        <div class="d-flex align-center gap-2">
          <button class="btn btn-sm btn-success" onclick="exportToExcel('recent')"><i class="fas fa-file-excel"></i> Excel</button>
          <a href="#" class="text-primary text-small" onclick="showComplaintsView()">सबै हेर्नुहोस्</a>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>दर्ता नं</th><th>दर्ता मिति</th><th>उजुरकर्ता</th><th>विपक्षी</th><th>उजुरीको संक्षिप्त विवरण</th><th>उजुरीको स्थिति</th><th>कार्य</th></tr></thead>
            <tbody>
              ${shakhaComplaints.slice(0, 5).map(complaint => `
                <tr>
                  <td data-label="दर्ता नं">${complaint.id}</td><td data-label="दर्ता मिति">${complaint.date}</td><td data-label="उजुरकर्ता">${complaint.complainant}</td><td data-label="विपक्षी">${complaint.accused || '-'}</td>
                  <td data-label="उजुरीको संक्षिप्त विवरण" class="text-limit">${(complaint.description || '').substring(0, 50)}...</td>
                  <td data-label="उजुरीको स्थिति"><span class="status-badge ${complaint.status === 'resolved' ? 'status-resolved' : complaint.status === 'pending' ? 'status-pending' : 'status-progress'}">${complaint.status === 'resolved' ? 'फछ्रयौट' : complaint.status === 'pending' ? 'काम बाँकी' : 'चालु'}</span></td>
                  <td data-label="कार्य"><button class="action-btn" data-action="view" data-id="${complaint.id}" title="हेर्नुहोस्"><i class="fas fa-eye"></i></button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function showComplaintsView(initialFilters = {}) {
  console.log('📋 showComplaintsView() called', initialFilters);
  
  state.currentView = 'complaints';
  
  // Load saved filters if no specific filters are passed (and we aren't just switching views without intent to reset)
  if (Object.keys(initialFilters).length === 0) {
      try {
          const saved = JSON.parse(localStorage.getItem('nvc_complaints_filters'));
          if (saved) initialFilters = saved;
      } catch(e) { console.error('Error loading saved filters', e); }
  }

  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) {
    pageTitle.textContent = 'उजुरीहरू';
  }
  
  // Safety check
  if (!state.complaints) {
    state.complaints = [];
  }
  
  // शाखा अनुसार फिल्टर: admin ले सबै, शाखाले आफ्नो मात्र
  let complaintsToShow = state.complaints;
  if (state.currentUser?.role === 'shakha') {
    const userShakhaName = (state.currentUser.shakha || '').trim();
    const userCode = (state.currentUser.id || '').trim();
    complaintsToShow = complaintsToShow.filter(c => {
      const cShakha = (c.shakha || '').trim();
      return cShakha === userShakhaName || 
             cShakha.toLowerCase() === userCode.toLowerCase() ||
             SHAKHA[cShakha] === userShakhaName ||
             SHAKHA[cShakha.toUpperCase()] === userShakhaName;
    });
  } else if (state.currentUser?.role === 'mahashakha') {
    complaintsToShow = complaintsToShow.filter(c => c.mahashakha === state.currentUser.mahashakha || c.mahashakha === state.currentUser.name);
  }
  
  // Filter based on search and status
  const statusFilter = initialFilters.status || '';
  const priorityFilter = initialFilters.priority || '';
  const shakhaFilter = initialFilters.shakha || '';
  const searchField = initialFilters.searchField || 'all';
  const searchFilter = (initialFilters.search || '').toLowerCase();
  const startDate = initialFilters.startDate || '';
  const endDate = initialFilters.endDate || '';
  const sortOrder = initialFilters.sortOrder || 'newest';

  if (statusFilter) {
    complaintsToShow = complaintsToShow.filter(c => c.status === statusFilter);
  }

  if (priorityFilter) {
    complaintsToShow = complaintsToShow.filter(c => {
        // Analyze priority on the fly if not stored
        const analysis = AI_SYSTEM.analyzeComplaint(c.description || '');
        return analysis.priority === priorityFilter;
    });
  }

  if (shakhaFilter) {
      complaintsToShow = complaintsToShow.filter(c => (c.shakha || '') === shakhaFilter);
  }

  if (startDate || endDate) {
      complaintsToShow = complaintsToShow.filter(c => {
          const cDate = c.date || c['दर्ता मिति'] || '';
          if (!cDate) return false;
          // Simple string comparison works for YYYY-MM-DD
          if (startDate && cDate < startDate) return false;
          if (endDate && cDate > endDate) return false;
          return true;
      });
  }

  if (searchFilter) {
    complaintsToShow = complaintsToShow.filter(c => {
        if (searchField === 'id') return String(c.id).toLowerCase().includes(searchFilter);
        if (searchField === 'complainant') return String(c.complainant).toLowerCase().includes(searchFilter);
        if (searchField === 'accused') return String(c.accused || '').toLowerCase().includes(searchFilter);
        if (searchField === 'description') return String(c.description).toLowerCase().includes(searchFilter);
        // Default: All fields
        return JSON.stringify(c).toLowerCase().includes(searchFilter);
    });
  }

  console.log(`📊 Total complaints: ${complaintsToShow.length}`);
  
  // Sort complaints by registration date. Default newest first, support oldest as well.
  complaintsToShow.sort((a, b) => {
    const getSortableDate = (c) => {
      // Prioritize c.date (BS) as it is displayed in the table
      let val = c.date || c['दर्ता मिति'] || c.entryDate || '';
      if (!val) return '';
      
      // Normalize Devanagari to Latin digits
      val = String(val).replace(/[०-९]/g, d => "0123456789"["०१२३४५६७८९".indexOf(d)]);
      
      // Extract YYYY-MM-DD
      const match = val.match(/(\d{4})[\-\/.](\d{1,2})[\-\/.](\d{1,2})/);
      if (match) {
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      }
      return val;
    };

    const dateA = getSortableDate(a);
    const dateB = getSortableDate(b);

    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    if (sortOrder === 'oldest') {
      return dateA.localeCompare(dateB);
    } else {
      return dateB.localeCompare(dateA);
    }
  });

  // पेजिनेसन
  const itemsPerPage = state.pagination?.itemsPerPage || 10;
  const currentPage = state.pagination?.currentPage || 1;
  const totalItems = complaintsToShow.length;
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedComplaints = complaintsToShow.slice(startIndex, endIndex);
  
  console.log(`📄 Showing ${startIndex + 1} to ${endIndex} of ${totalItems}`);
  
  // Table rows बनाउने
  let tableRows = '';
  
  if (paginatedComplaints.length === 0) {
    tableRows = `<tr><td colspan="11" class="text-center p-4">कुनै उजुरी फेला परेन</td></tr>`;
  } else {
    paginatedComplaints.forEach(complaint => {
      // सबै fields लिने - विभिन्न सम्भावित नामहरू
      const id = complaint.id || 
                 complaint['उजुरी दर्ता नं'] || 
                 '-';
      
      // AI Analysis for Priority Badge
      const analysis = AI_SYSTEM.analyzeComplaint(complaint.description || '');
      const priorityBadge = analysis.priority === 'उच्च' ? '<span class="badge badge-danger">उच्च</span>' : 
                            analysis.priority === 'मध्यम' ? '<span class="badge badge-warning">मध्यम</span>' : '';

      // Prefer Nepali display if available, otherwise use normalized date
      const dateRaw = complaint.date || complaint['दर्ता मिति'] || '-';
      const dateNep = complaint.dateNepali || complaint['दर्ता मिति नेपाली'] || complaint['नेपाली मिति'] || '';
      // If Nepali display already provided, show it. Otherwise convert Latin digits to Devanagari for display.
      const date = dateNep ? dateNep : _latinToDevnagari(String(dateRaw));
      
      const complainant = complaint.complainant || 
                          complaint['उजुरीकर्ताको नाम'] || 
                          '-';
      
      const accused = complaint.accused || 
                      complaint['विपक्षी'] || 
                      '-';
      
      const description = complaint.description || 
                          complaint['उजुरीको संक्षिप्त विवरण'] || 
                          '';
      
      const decision = complaint.decision || 
                       complaint['अन्तिम निर्णय'] || 
                       '';
      
      const remarks = complaint.remarks || 
                      complaint['कैफियत'] || 
                      '-';
      
      const shakha = complaint.shakha || 
                     complaint['सम्बन्धित शाखा'] || 
                     '-';
      
      // Status
      const status = complaint.status || 
                     complaint['स्थिति'] || 
                     'pending';
      
      let statusText = 'काम बाँकी';
      let statusClass = 'status-pending';
      
      if (status === 'resolved' || status === 'फछ्रयौट') {
        statusText = 'फछ्रयौट';
        statusClass = 'status-resolved';
      } else if (status === 'progress' || status === 'चालु') {
        statusText = 'चालु';
        statusClass = 'status-progress';
      }
      
      tableRows += `
        <tr>
          <td data-label="दर्ता नं"><strong>${id}</strong></td>
          <td data-label="मिति">${date} ${priorityBadge}</td>
          <td data-label="उजुरकर्ता">${complainant}</td>
          <td data-label="विपक्षी">${accused}</td>
          <td data-label="उजुरीको विवरण" class="text-limit" title="${description}">${description.substring(0, 50)}${description.length > 50 ? '...' : ''}</td>
          <td data-label="समितिको निर्णय" class="text-limit" title="${complaint.committeeDecision || ''}">${(complaint.committeeDecision || '').substring(0, 30)}${(complaint.committeeDecision || '').length > 30 ? '...' : ''}</td>
          <td data-label="अन्तिम निर्णय" class="text-limit" title="${decision || ''}">${(decision || '').substring(0, 30)}${(decision || '').length > 30 ? '...' : ''}</td>
          <td data-label="कैफियत">${remarks}</td>
          <td data-label="शाखा">${shakha}</td>
          <td data-label="स्थिति"><span class="status-badge ${statusClass}">${statusText}</span></td>
          <td data-label="कार्य">
            <div class="table-actions">
              <button class="action-btn" onclick="handleTableActions(event)" data-action="view" data-id="${id}" title="हेर्नुहोस्"><i class="fas fa-eye"></i></button>
              ${state.currentUser.role === 'admin' || state.currentUser.role === 'shakha' ? `<button class="action-btn" onclick="handleTableActions(event)" data-action="edit" data-id="${id}" title="सम्पादन गर्नुहोस्"><i class="fas fa-edit"></i></button><button class="action-btn" onclick="handleTableActions(event)" data-action="delete" data-id="${id}" title="हटाउनुहोस्"><i class="fas fa-trash"></i></button>` : ''}
            </div>
          </td>
        </tr>
      `;
    });
  }
  
  // पेजिनेसन HTML
  const paginationHTML = renderPagination(totalItems, itemsPerPage, currentPage);
  
  // Generate Shakha Options
  let shakhaOptions = '<option value="">शाखा (सबै)</option>';
  if (state.currentUser.role === 'admin' || state.currentUser.role === 'mahashakha') {
      Object.entries(SHAKHA).forEach(([key, value]) => {
          shakhaOptions += `<option value="${value}" ${shakhaFilter === value ? 'selected' : ''}>${value}</option>`;
      });
  }

  const filterBarHTML = `
    <div class="filter-bar mb-3">
      <div class="d-flex justify-between align-center w-100 mb-2">
          <h6 class="mb-0"><i class="fas fa-filter"></i> फिल्टरहरू</h6>
          <button class="btn btn-sm btn-outline d-md-none" onclick="toggleFilterBar()">
            <i class="fas fa-chevron-down"></i>
          </button>
      </div>
      
      <div id="filterContent" class="w-100 d-none d-md-block">
          <div class="filter-grid">
            <!-- Group 1: Date Range -->
            <div class="filter-group-box">
                <label class="filter-group-label">मितिको दायरा (Range)</label>
                <div class="d-flex flex-wrap gap-2 align-center">
                    <div class="nepali-datepicker-dropdown" data-target="filterStartDate">
                        <select id="filterStartDate_year" class="form-select form-select-sm bs-year"><option value="">साल</option></select>
                        <select id="filterStartDate_month" class="form-select form-select-sm bs-month"><option value="">महिना</option></select>
                        <select id="filterStartDate_day" class="form-select form-select-sm bs-day"><option value="">गते</option></select>
                        <input type="hidden" id="filterStartDate" value="${startDate}" />
                    </div>
                    <span class="text-muted text-small">देखि</span>
                    <div class="nepali-datepicker-dropdown" data-target="filterEndDate">
                        <select id="filterEndDate_year" class="form-select form-select-sm bs-year"><option value="">साल</option></select>
                        <select id="filterEndDate_month" class="form-select form-select-sm bs-month"><option value="">महिना</option></select>
                        <select id="filterEndDate_day" class="form-select form-select-sm bs-day"><option value="">गते</option></select>
                        <input type="hidden" id="filterEndDate" value="${endDate}" />
                    </div>
                    <span class="text-muted text-small">सम्म</span>
                </div>
            </div>

            <!-- Group 2: Attributes -->
            <div class="filter-group-box">
                <label class="filter-group-label">विवरण</label>
                <div class="d-flex flex-wrap gap-2">
                    <select class="form-select form-select-sm" id="filterStatus" style="min-width: 100px;">
                        <option value="">स्थिति (सबै)</option>
                        <option value="pending" ${statusFilter === 'pending' ? 'selected' : ''}>काम बाँकी</option>
                        <option value="progress" ${statusFilter === 'progress' ? 'selected' : ''}>चालु</option>
                        <option value="resolved" ${statusFilter === 'resolved' ? 'selected' : ''}>फछ्रयौट</option>
                    </select>
                    <select class="form-select form-select-sm" id="filterPriority" style="min-width: 100px;">
                        <option value="">प्राथमिकता (सबै)</option>
                        <option value="उच्च" ${priorityFilter === 'उच्च' ? 'selected' : ''}>उच्च</option>
                        <option value="मध्यम" ${priorityFilter === 'मध्यम' ? 'selected' : ''}>मध्यम</option>
                        <option value="साधारण" ${priorityFilter === 'साधारण' ? 'selected' : ''}>साधारण</option>
                    </select>
                    <select class="form-select form-select-sm" id="filterShakha" style="min-width: 120px;">
                        ${shakhaOptions}
                    </select>
                </div>
            </div>

            <!-- Group 3: Search & Sort -->
            <div class="filter-group-box">
                <label class="filter-group-label">खोजी र क्रम</label>
                <div class="d-flex flex-wrap gap-2 align-center">
                    <select class="form-select form-select-sm" id="sortOrder" style="min-width: 110px;">
                        <option value="newest" ${sortOrder === 'newest' ? 'selected' : ''}>नयाँ -> पुरानो</option>
                        <option value="oldest" ${sortOrder === 'oldest' ? 'selected' : ''}>पुरानो -> नयाँ</option>
                    </select>
                    <div class="input-group input-group-sm flex-grow-1" style="min-width: 200px;">
                        <select class="form-select form-select-sm" id="searchField" style="max-width: 90px;">
                            <option value="all" ${searchField === 'all' ? 'selected' : ''}>सबै</option>
                            <option value="id" ${searchField === 'id' ? 'selected' : ''}>दर्ता नं</option>
                            <option value="complainant" ${searchField === 'complainant' ? 'selected' : ''}>उजुरकर्ता</option>
                            <option value="accused" ${searchField === 'accused' ? 'selected' : ''}>विपक्षी</option>
                            <option value="description" ${searchField === 'description' ? 'selected' : ''}>विवरण</option>
                        </select>
                        <input type="text" class="form-control" placeholder="खोज्नुहोस्..." id="searchText" value="${searchFilter}" onkeyup="if(event.key === 'Enter') filterComplaintsTable()">
                    </div>
                </div>
            </div>
            
            <!-- Group 4: Actions -->
            <div class="filter-actions-row">
                <button class="btn btn-sm btn-primary" onclick="filterComplaintsTable()"><i class="fas fa-search"></i> खोज्नुहोस्</button>
                <button class="btn btn-sm btn-outline-secondary" onclick="clearComplaintsFilters()"><i class="fas fa-times"></i> रिसेट</button>
                <button class="btn btn-sm btn-outline-primary" onclick="saveComplaintsFilters()"><i class="fas fa-save"></i> फिल्टर सेभ</button>
                <button class="btn btn-sm btn-success ms-auto" onclick="exportToExcel('complaints')"><i class="fas fa-file-excel"></i> Excel</button>
            </div>
          </div>
      </div>
    </div>
  `;

  const content = `
    <style>
      .table-reduced-padding th, .table-reduced-padding td {
        padding-left: 0.35rem !important;
        padding-right: 0.35rem !important;
      }
    </style>
    ${filterBarHTML}
    <div class="card">
      <div class="card-header d-flex justify-between align-center">
        <h5 class="mb-0">उजुरी सूची (${totalItems})</h5>
        <div class="d-flex gap-2">
          <select class="form-select form-select-sm" style="width: auto;" onchange="changeItemsPerPage(this.value)">
            <option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>१० प्रति पेज</option>
            <option value="20" ${itemsPerPage === 20 ? 'selected' : ''}>२० प्रति पेज</option>
            <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>५० प्रति पेज</option>
            <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>१०० प्रति पेज</option>
          </select>
          <button class="btn btn-sm btn-primary" onclick="refreshData()">
            <i class="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-reduced-padding">
            <thead>
              <tr>
                <th>दर्ता नं</th>
                <th>मिति</th>
                <th>उजुरकर्ता</th>
                <th>विपक्षी</th>
                <th>उजुरीको विवरण</th>
                <th>समितिको निर्णय</th>
                <th>अन्तिम निर्णय</th>
                <th>कैफियत</th>
                <th>शाखा</th>
                <th>स्थिति</th>
                <th>कार्य</th>
              </tr>
            </thead>
            <tbody id="complaintsTableBody">
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card-footer d-flex justify-between align-center">
        <div class="text-small text-muted">
          देखाउँदै ${totalItems > 0 ? startIndex + 1 : 0} - ${endIndex} of ${totalItems}
        </div>
        ${paginationHTML}
      </div>
    </div>
  `;
  
  const contentArea = document.getElementById('contentArea');
  if (contentArea) {
    contentArea.innerHTML = content;
    console.log('✅ Content area updated');
    
    // If filters were provided from the UI's filter action, avoid re-triggering
    // filterComplaintsTable to prevent a render loop. filterComplaintsTable will
    // call showComplaintsView with `_fromFilter: true` which we check here.
    if ((initialFilters.status || initialFilters.search) && !initialFilters._fromFilter) {
      setTimeout(filterComplaintsTable, 100);
    }
    setTimeout(() => { initializeNepaliDropdowns(); }, 100);
    // Rely on the centralized delegated handler in setupEventListeners() for action buttons
  }
  updateActiveNavItem();
}

function renderPagination(totalItems, itemsPerPage, currentPage) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalPages <= 1) {
    return '';
  }
  
  let paginationHTML = '<nav><ul class="pagination mb-0">';
  
  // Previous button
  paginationHTML += `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">पछिल्लो</a>
    </li>
  `;
  
  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      paginationHTML += `
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
        </li>
      `;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
  }
  
  // Next button
  paginationHTML += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">अर्को</a>
    </li>
  `;
  
  paginationHTML += '</ul></nav>';
  
  return paginationHTML;
}

function changePage(page) {
  console.log('📄 changePage() called with page:', page);
  
  if (!state.pagination) {
    state.pagination = { currentPage: 1, itemsPerPage: 10 };
  }
  
  let totalItems = 0;
  if (state.currentUser && state.currentUser.role !== 'admin') {
    if (state.currentUser.role === 'shakha') {
        const userShakhaName = (state.currentUser.shakha || '').trim();
        const userCode = (state.currentUser.id || '').trim();
        totalItems = state.complaints.filter(c => {
          const cShakha = (c.shakha || '').trim();
          return cShakha === userShakhaName || 
                 cShakha.toLowerCase() === userCode.toLowerCase() ||
                 SHAKHA[cShakha] === userShakhaName ||
                 SHAKHA[cShakha.toUpperCase()] === userShakhaName;
        }).length;
    } else if (state.currentUser.role === 'mahashakha') {
        totalItems = state.complaints.filter(c => c.mahashakha === state.currentUser.mahashakha || c.mahashakha === state.currentUser.name).length;
    }
  } else {
    totalItems = state.complaints?.length || 0;
  }
  
  const itemsPerPage = state.pagination.itemsPerPage || 10;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (page < 1 || page > totalPages) {
    return;
  }
  
  state.pagination.currentPage = page;
  
  // Current view update गर्ने
  if (state.currentView === 'complaints' || state.currentView === 'all_complaints') {
    showComplaintsView();
  }
}

function changeItemsPerPage(perPage) {
  console.log('📄 changeItemsPerPage() called with:', perPage);
  
  if (!state.pagination) {
    state.pagination = { currentPage: 1 };
  }
  
  state.pagination.itemsPerPage = parseInt(perPage);
  state.pagination.currentPage = 1;
  
  // Current view update गर्ने
  if (state.currentView === 'complaints' || state.currentView === 'all_complaints') {
    showComplaintsView();
  }
}

async function testDataLoad() {
  console.log('🧪 Testing data load...');
  console.log('Current state before load:', state.complaints.length);
  
  const result = await loadDataFromGoogleSheets(true);
  
  console.log('Load result:', result);
  console.log('State after load:', state.complaints.length);
  
  if (state.complaints.length > 0) {
    console.log('First complaint:', state.complaints[0]);
  }
  
  return result;
}

async function testDirectAPI() {
  console.log('🧪 Testing direct API call...');
  
  const response = await getFromGoogleSheets('getComplaints');
  
  console.log('API Response:', response);
  
  return response;
}

function checkState() {
  console.log('📊 Current State:');
  console.log('- User:', state.currentUser?.name || 'Not logged in');
  console.log('- Page:', state.currentPage);
  console.log('- View:', state.currentView);
  console.log('- Complaints:', state.complaints?.length || 0);
  console.log('- Projects:', state.projects?.length || 0);
  console.log('- Employee Monitoring:', state.employeeMonitoring?.length || 0);
  console.log('- Citizen Charters:', state.citizenCharters?.length || 0);
  
  return state;
}

function showAllComplaintsView() {
  state.currentView = 'all_complaints';
  document.getElementById('pageTitle').textContent = 'सबै उजुरीहरू';
  showComplaintsView();
  updateActiveNavItem();
}

function showAdminComplaintsView(initialFilters = {}) {
  state.currentView = 'admin_complaints';
  document.getElementById('pageTitle').textContent = 'हेलो सरकारबाट प्राप्त उजुरीहरू';
  
  const helloSarkarComplaints = state.complaints.filter(c => c.source === 'hello_sarkar');
  
  const content = `
    <div class="filter-bar mb-3">
      <div class="filter-group"><label class="filter-label">स्थिति:</label><select class="form-select form-select-sm" id="filterStatus"><option value="">सबै</option><option value="pending" ${initialFilters.status === 'pending' ? 'selected' : ''}>काम बाँकी</option><option value="progress">चालु</option><option value="resolved">फछ्रयौट</option></select></div>
      <div class="filter-group"><input type="text" class="form-control form-control-sm" placeholder="खोज्नुहोस्..." id="searchText" value="${initialFilters.search || ''}" /></div>
      <button class="btn btn-primary btn-sm" onclick="filterAdminComplaints()">खोज्नुहोस्</button>
      <button class="btn btn-success btn-sm" onclick="exportToExcel('hello_sarkar')"><i class="fas fa-file-excel"></i> Excel</button>
      <button class="btn btn-warning btn-sm" onclick="autoAssignHelloSarkarComplaints()"><i class="fas fa-robot"></i> Auto Assign</button>
      <button class="btn btn-primary btn-sm" onclick="showNewHelloSarkarComplaint()"><i class="fas fa-plus"></i> नयाँ उजुरी</button>
    </div>
    
    <div class="card">
      <div class="card-header"><h5 class="mb-0">हेलो सरकारबाट प्राप्त उजुरी सूची</h5></div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>क्र.सं.</th><th>मिति</th><th>उजुरकर्ता</th><th>विपक्षी</th><th>उजुरीको विवरण</th><th>सम्बन्धित शाखा</th><th>शाखामा पठाएको मिति</th><th>निर्णय</th><th>कैफियत</th><th>कार्य</th></tr></thead>
            <tbody id="adminComplaintsTable">
              ${helloSarkarComplaints.map((complaint, index) => `
                <tr>
                  <td data-label="क्र.सं.">${index + 1}</td><td data-label="मिति">${complaint.date}</td><td data-label="उजुरकर्ता">${complaint.complainant}</td><td data-label="विपक्षी">${complaint.accused || '-'}</td>
                  <td data-label="उजुरीको विवरण" class="text-limit" title="${complaint.description}">${complaint.description.substring(0, 50)}...</td>
                  <td data-label="सम्बन्धित शाखा">${complaint.assignedShakha || '-'}</td><td data-label="शाखामा पठाएको मिति">${complaint.assignedDate || '-'}</td>
                  <td data-label="निर्णय" class="text-limit" title="${complaint.decision || ''}">${complaint.decision ? complaint.decision.substring(0, 30) + '...' : '-'}</td>
                  <td data-label="कैफियत">${complaint.remarks || '-'}</td>
                  <td data-label="कार्य"><div class="table-actions"><button class="action-btn" data-action="view" data-id="${complaint.id}" title="हेर्नुहोस्"><i class="fas fa-eye"></i></button><button class="action-btn" data-action="assign" data-id="${complaint.id}" title="शाखामा पठाउनुहोस्"><i class="fas fa-paper-plane"></i></button></div></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('contentArea').innerHTML = content;
  if (initialFilters.status || initialFilters.search) {
    setTimeout(filterAdminComplaints, 100);
  }
  updateActiveNavItem();
}

function showNewComplaintView() {
  state.currentView = 'new_complaint';
  document.getElementById('pageTitle').textContent = 'नयाँ उजुरी दर्ता';
  
  const currentDate = getCurrentNepaliDate();
  
  const content = `
    <style>
      .hotspot-card {
        background: #f8f9fa;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .hotspot-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.08);
        border-color: var(--primary);
      }
      .progress-bar {
        background-color: #dc3545;
      }
    </style>
    <div class="card">
      <div class="card-header"><h5 class="mb-0">नयाँ उजुरी दर्ता फारम</h5></div>
      <div class="card-body">
        <div class="d-grid gap-3" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
          <div class="form-group"><label class="form-label">दर्ता नं *</label><input type="text" class="form-control" id="complaintId" placeholder="NVC-YYYY-NNNN" /></div>
          <div class="form-group">
            <label class="form-label">दर्ता मिति *</label>
            <div class="d-flex gap-2 nepali-datepicker-dropdown" data-target="complaintDate">
              <select id="complaintDate_year" class="form-select bs-year" aria-label="वर्ष"></select>
              <select id="complaintDate_month" class="form-select bs-month" aria-label="महिना"></select>
              <select id="complaintDate_day" class="form-select bs-day" aria-label="दिन"></select>
              <input type="hidden" id="complaintDate" value="${currentDate}" />
            </div>
            <div id="dateWarning" class="text-danger text-xs mt-1 hidden"><i class="fas fa-exclamation-triangle"></i> भविष्यको मिति चयन गरिएको छ</div>
          </div>
          <div class="form-group"><label class="form-label">उजुरकर्ताको नाम *</label><input type="text" class="form-control" id="complainantName" placeholder="पूरा नाम" /></div>
          <div class="form-group"><label class="form-label">विपक्षी</label><input type="text" class="form-control" id="accusedName" placeholder="विपक्षीको नाम" /></div>
          ${state.currentUser.role === 'admin' ? `
          <div class="form-group"><label class="form-label">सम्बन्धित शाखा</label>
            <select class="form-select" id="complaintShakha">
                <option value="">शाखा छान्नुहोस् (अनिवार्य छैन)</option>
                ${Object.values(SHAKHA).map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>
            <div id="aiShakhaSuggestion" class="mt-2 hidden"></div>
          </div>` : ''}
          
          <div class="location-section mb-3" style="grid-column: span 2;">
            <h6 class="mb-2">📍 स्थान जानकारी</h6>
            <div class="d-grid gap-2" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
              <div class="form-group">
                <label class="form-label">प्रदेश</label>
                <select class="form-select" id="complaintProvince" onchange="loadDistricts()">
                  <option value="">प्रदेश छान्नुहोस्</option>
                  ${Object.entries(LOCATION_FIELDS.PROVINCE).map(([key, value]) => 
                    `<option value="${key}">${value}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">जिल्ला</label>
                <select class="form-select" id="complaintDistrict" disabled>
                  <option value="">पहिला प्रदेश छान्नुहोस्</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">स्थानीय तह / नगर</label>
                <input type="text" class="form-control" id="complaintLocation" placeholder="जस्तै: काठमाडौं महानगरपालिका">
              </div>
            </div>
          </div>

          <div class="form-group" style="grid-column: span 2;">
            <label class="form-label">उजुरीको विवरण *</label>
            <textarea class="form-control" rows="3" id="complaintDescription" placeholder="उजुरीको संक्षिप्त विवरण" maxlength="500"></textarea>
            <div class="d-flex justify-between mt-1">
                <div class="text-xs text-muted" id="descCount">०/५०० अक्षर</div>
                <div id="descQuality" class="text-xs"></div>
            </div>
          </div>
          
          <!-- AI Analysis Section -->
          <div class="form-group" style="grid-column: span 2;" id="aiSuggestionBox">
            <div class="ai-analysis-box hidden" id="aiSuggestionContent">
                <div class="mb-2 border-bottom pb-2">
                    <i class="fas fa-robot"></i> <strong>AI विश्लेषण</strong>
                </div>
                <div class="row g-2">
                    <div class="col-md-6">
                        <div id="aiCategoryText" class="mb-1"></div>
                        <div id="aiPriorityText" class="mb-1"></div>
                    </div>
                    <div class="col-md-6">
                         <div id="aiDecisionSuggestion" class="text-small text-muted fst-italic"></div>
                    </div>
                </div>
            </div>
            <div id="similarComplaintsBox" class="mt-2 hidden">
                <div class="alert alert-warning p-2">
                    <h6 class="alert-heading text-small mb-1"><i class="fas fa-copy"></i> सम्भावित उस्तै उजुरीहरू</h6>
                    <ul class="mb-0 ps-3 text-small" id="similarComplaintsList"></ul>
                </div>
            </div>
          </div>          
          
          <div class="form-group" style="grid-column: span 2;"><label class="form-label">समितिको निर्णय</label><textarea class="form-control" rows="3" id="committeeDecision" placeholder="समितिको निर्णय" maxlength="500"></textarea><div class="text-xs text-muted mt-1" id="committeeDecisionCount">०/५०० अक्षर</div></div>
          <div class="form-group"><label class="form-label">कैफियत</label><input type="text" class="form-control" id="complaintRemarks" placeholder="कैफियत" /></div>
          <div class="form-group"><label class="form-label">स्थिति *</label><select class="form-select" id="complaintStatus"><option value="pending">काम बाँकी</option><option value="progress">चालु</option><option value="resolved">फछ्रयौट</option></select></div>
        </div>
        <div class="mt-4 d-flex justify-end gap-2">
          <button class="btn btn-outline" onclick="showComplaintsView()">रद्द गर्नुहोस्</button>
          <button class="btn btn-primary" onclick="saveNewComplaint()">सुरक्षित गर्नुहोस्</button>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('contentArea').innerHTML = content;
  updateActiveNavItem();
  
  setTimeout(() => {
    initializeDatepickers(); initializeNepaliDropdowns();
    
    // Date validation
    const dateInput = document.getElementById('complaintDate');
    if (dateInput) {
        const checkDate = () => {
            const val = dateInput.value;
            const cur = getCurrentNepaliDate();
            const warning = document.getElementById('dateWarning');
            if (val && cur && val > cur) {
                warning.classList.remove('hidden');
            } else {
                warning.classList.add('hidden');
            }
        };
        dateInput.addEventListener('change', checkDate);
        dateInput.addEventListener('input', checkDate);
    }

    const descTextarea = document.getElementById('complaintDescription');
    if (descTextarea) {
        descTextarea.addEventListener('input', function() { 
            const text = this.value;
            document.getElementById('descCount').textContent = text.length + '/५०० अक्षर';
            
            // Quality Check
            const qualityEl = document.getElementById('descQuality');
            if (text.length > 0 && text.length < 50) {
                qualityEl.innerHTML = '<span class="text-warning"><i class="fas fa-exclamation-circle"></i> विवरण धेरै छोटो छ</span>';
            } else if (text.length >= 50) {
                qualityEl.innerHTML = '<span class="text-success"><i class="fas fa-check-circle"></i> विवरण पर्याप्त छ</span>';
            } else {
                qualityEl.innerHTML = '';
            }

            if (text.length > 10) {
                // 1. AI Analysis
                const analysis = AI_SYSTEM.analyzeComplaint(text);
                const aiSuggContent = document.getElementById('aiSuggestionContent');
                if (aiSuggContent) {
                    aiSuggContent.classList.remove('hidden');
                    document.getElementById('aiCategoryText').innerHTML = `श्रेणी: <span class="badge badge-secondary">${analysis.category}</span>`;
                    document.getElementById('aiPriorityText').innerHTML = `प्राथमिकता: <span class="badge ${analysis.priority === 'उच्च' ? 'badge-danger' : analysis.priority === 'मध्यम' ? 'badge-warning' : 'badge-success'}">${analysis.priority}</span>`;
                    document.getElementById('aiCategoryText').innerHTML += ` <br>वर्गीकरण: <span class="badge badge-info">${analysis.classification}</span>`;
                    
                    // Auto-categorization for decision
                    let decisionSugg = '';
                    if (analysis.priority === 'उच्च') decisionSugg = 'सुझाव: तुरुन्त कारबाही प्रक्रिया अगाडि बढाउने।';
                    else if (analysis.category === 'प्राविधिक') decisionSugg = 'सुझाव: प्राविधिक टोली खटाउने।';
                    else decisionSugg = 'सुझाव: सामान्य प्रक्रियामा राख्ने।';
                    document.getElementById('aiDecisionSuggestion').textContent = decisionSugg;
                }

                // 2. Shakha Suggestion (Admin only usually, but logic runs)
                const shakhaCode = AI_SYSTEM.suggestShakha(text);
                const shakhaName = SHAKHA[shakhaCode] || shakhaCode;
                const suggestionEl = document.getElementById('aiShakhaSuggestion');
                if (suggestionEl && state.currentUser.role === 'admin') {
                    suggestionEl.classList.remove('hidden');
                    suggestionEl.innerHTML = `
                        <div class="d-flex align-center gap-2 p-2 bg-light rounded border border-primary">
                            <i class="fas fa-robot text-primary"></i>
                            <span class="text-small">सुझाव गरिएको शाखा: <strong>${shakhaName}</strong></span>
                            <button class="btn btn-sm btn-outline-primary py-0 px-2" style="font-size: 0.7rem;" onclick="document.getElementById('complaintShakha').value = '${shakhaName}'">लागू गर्नुहोस्</button>
                        </div>
                    `;
                }

                // 3. Similar Complaints
                const similarBox = document.getElementById('similarComplaintsBox');
                const similarList = document.getElementById('similarComplaintsList');
                
                // Simple keyword extraction (remove common words)
                const keywords = text.split(/\s+/).filter(w => w.length > 3).slice(0, 5);
                if (keywords.length > 0) {
                    const similar = state.complaints.filter(c => {
                        if (!c.description) return false;
                        let matchCount = 0;
                        keywords.forEach(k => {
                            if (c.description.includes(k)) matchCount++;
                        });
                        // Relaxed logic: if we have few keywords, 1 match is enough.
                        return matchCount >= (keywords.length < 3 ? 1 : 2);
                    }).slice(0, 3);

                    if (similar.length > 0) {
                        similarBox.classList.remove('hidden');
                        similarList.innerHTML = similar.map(c => `
                            <li>
                              <a href="#" class="text-dark text-decoration-none action-btn" data-action="view" data-id="${c.id}">
                                <strong>${c.id}</strong>: ${c.description.substring(0, 40)}...
                              </a>
                            </li>
                        `).join('');
                    } else {
                        similarBox.classList.add('hidden');
                    }
                } else {
                    similarBox.classList.add('hidden');
                }
            } else {
                document.getElementById('aiSuggestionContent')?.classList.add('hidden');
                document.getElementById('aiShakhaSuggestion')?.classList.add('hidden');
                document.getElementById('similarComplaintsBox')?.classList.add('hidden');
            }
        });
    }
    
    const committeeDecisionTextarea = document.getElementById('committeeDecision');
    if (committeeDecisionTextarea) committeeDecisionTextarea.addEventListener('input', function() { 
        document.getElementById('committeeDecisionCount').textContent = this.value.length + '/५०० अक्षर'; 
    });
  }, 100);
}

function showNewHelloSarkarComplaint() {
  const currentDate = getCurrentNepaliDate();
  const formContent = `
    <div class="d-grid gap-3">
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group"><label class="form-label">उजुरी नं *</label><input type="text" class="form-control" id="hsComplaintId" placeholder="HS-YYYY-NNNN" /></div>
        <div class="form-group">
            <label class="form-label">मिति *</label>
            <div class="d-flex gap-2 nepali-datepicker-dropdown" data-target="hsComplaintDate">
              <select id="hsComplaintDate_year" class="form-select bs-year" aria-label="वर्ष"></select>
              <select id="hsComplaintDate_month" class="form-select bs-month" aria-label="महिना"></select>
              <select id="hsComplaintDate_day" class="form-select bs-day" aria-label="दिन"></select>
              <input type="hidden" id="hsComplaintDate" value="${currentDate}" />
            </div>
        </div>
      </div>
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group"><label class="form-label">उजुरकर्ता *</label><input type="text" class="form-control" id="hsComplainant" placeholder="पूरा नाम" /></div>
        <div class="form-group"><label class="form-label">विपक्षी</label><input type="text" class="form-control" id="hsAccused" placeholder="विपक्षीको नाम" /></div>
      </div>
      <div class="form-group"><label class="form-label">उजुरीको विवरण *</label><textarea class="form-control" rows="4" id="hsDescription" placeholder="उजुरीको विवरण"></textarea></div>
      <div class="form-group"><label class="form-label">सम्बन्धित शाखा *</label><select class="form-select" id="hsAssignedShakha"><option value="">छान्नुहोस्</option>${Object.entries(SHAKHA).map(([key, value]) => `<option value="${key}">${value}</option>`).join('')}</select></div>
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group">
            <label class="form-label">शाखामा पठाएको मिति</label>
            <div class="d-flex gap-2 nepali-datepicker-dropdown" data-target="hsAssignedDate">
              <select id="hsAssignedDate_year" class="form-select bs-year" aria-label="वर्ष"></select>
              <select id="hsAssignedDate_month" class="form-select bs-month" aria-label="महिना"></select>
              <select id="hsAssignedDate_day" class="form-select bs-day" aria-label="दिन"></select>
              <input type="hidden" id="hsAssignedDate" />
            </div>
        </div>
        <div class="form-group"><label class="form-label">स्थिति</label><select class="form-select" id="hsStatus"><option value="pending">काम बाँकी</option><option value="progress">चालु</option><option value="resolved">फछ्रयौट</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">कैफियत</label><textarea class="form-control" rows="2" id="hsRemarks" placeholder="कैफियत"></textarea></div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">रद्द गर्नुहोस्</button><button class="btn btn-primary" onclick="saveHelloSarkarComplaint()">सुरक्षित गर्नुहोस्</button></div>
  `;
  
  openModal('नयाँ हेलो सरकार उजुरी', formContent);
  setTimeout(()=>{ initializeDatepickers(); initializeNepaliDropdowns(); }, 100);
}

async function saveHelloSarkarComplaint() {
  const id = document.getElementById('hsComplaintId').value;
  const date = document.getElementById('hsComplaintDate').value;
  const complainant = document.getElementById('hsComplainant').value;
  const accused = document.getElementById('hsAccused').value;
  const description = document.getElementById('hsDescription').value;
  const assignedShakha = document.getElementById('hsAssignedShakha').value;
  const assignedDate = document.getElementById('hsAssignedDate').value;
  const status = document.getElementById('hsStatus').value;
  const remarks = document.getElementById('hsRemarks').value;
  
  if (!id || !date || !complainant || !description || !assignedShakha) {
    showToast('कृपया आवश्यक फिल्डहरू भर्नुहोस्', 'warning');
    return;
  }
  
  showLoadingIndicator(true);

  const newComplaint = {
    id, date, complainant, accused: accused || '', description,
    assignedShakha, assignedDate: assignedDate || '', status,
    remarks: remarks || '', shakha: 'admin_planning',
    mahashakha: MAHASHAKHA.ADMIN_MONITORING, source: 'hello_sarkar',
    createdBy: state.currentUser.name, createdAt: new Date().toISOString()
  };
  
  // Google Sheet मा सेभ गर्ने
  const result = await postToGoogleSheets('saveComplaint', newComplaint);
  
  if (result && result.success) {
    newComplaint.syncedToSheets = true;
  }

  state.complaints.push(newComplaint);
  showLoadingIndicator(false);
  showToast(result.success ? 'उजुरी Google Sheet मा सुरक्षित गरियो' : 'उजुरी Local मा सुरक्षित गरियो', result.success ? 'success' : 'warning');
  closeModal();
  showAdminComplaintsView();
}

async function autoAssignHelloSarkarComplaints() {
  const pending = state.complaints.filter(c => c.source === 'hello_sarkar' && (!c.assignedShakha || c.status === 'pending'));
  
  if (pending.length === 0) {
    showToast('स्वत: असाइन गर्न कुनै नयाँ उजुरी छैन', 'info');
    return;
  }
  
  if (!confirm(`${pending.length} वटा उजुरीहरूलाई AI मार्फत स्वतः शाखा तोक्न चाहनुहुन्छ?`)) return;

  showLoadingIndicator(true);
  let count = 0;
  
  for (const c of pending) {
    const shakhaKey = AI_SYSTEM.suggestShakha(c.description);
    const shakhaName = SHAKHA[shakhaKey] || shakhaKey;
    
    if (shakhaName) {
      c.assignedShakha = shakhaName;
      c.assignedDate = getCurrentNepaliDate();
      c.status = 'progress';
      c.remarks = (c.remarks ? c.remarks + ' ' : '') + '[AI Auto-Assigned]';
      
      await postToGoogleSheets('updateComplaint', {
        id: c.id, assignedShakha: c.assignedShakha, assignedDate: c.assignedDate,
        status: c.status, remarks: c.remarks, updatedBy: 'AI System'
      });
      count++;
    }
  }
  
  showLoadingIndicator(false);
  showToast(`${count} वटा उजुरीहरू सफलतापूर्वक शाखामा पठाइयो`, 'success');
  showAdminComplaintsView();
}

function assignToShakha(id) {
  const complaint = state.complaints.find(c => c.id === id);
  if (!complaint) return;
  
  const currentDate = getCurrentNepaliDate();
  const formContent = `
    <div class="d-grid gap-3">
      <div class="form-group"><label class="form-label">उजुरी नं</label><input type="text" class="form-control" value="${complaint.id}" readonly /></div>
      <div class="form-group"><label class="form-label">शाखा *</label><select class="form-select" id="assignShakha"><option value="">छान्नुहोस्</option>${Object.entries(SHAKHA).map(([key, value]) => `<option value="${key}" ${complaint.assignedShakha === key ? 'selected' : ''}>${value}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">पठाएको मिति *</label>
        <div class="d-flex gap-2 nepali-datepicker-dropdown" data-target="assignDate">
          <select id="assignDate_year" class="form-select bs-year"><option value="">साल</option></select>
          <select id="assignDate_month" class="form-select bs-month"><option value="">महिना</option></select>
          <select id="assignDate_day" class="form-select bs-day"><option value="">गते</option></select>
          <input type="hidden" id="assignDate" value="${currentDate}" />
        </div>
      </div>
      <div class="form-group"><label class="form-label">सन्देश</label><textarea class="form-control" rows="3" id="assignInstructions" placeholder="शाखालाई दिने सन्देश"></textarea></div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">रद्द गर्नुहोस्</button><button class="btn btn-primary" onclick="saveShakhaAssignment('${id}')">पठाउनुहोस्</button></div>
  `;
  
  openModal('शाखामा उजुरी पठाउनुहोस्', formContent);
  setTimeout(()=>{ initializeDatepickers(); initializeNepaliDropdowns(); }, 100);
}

async function saveShakhaAssignment(id) {
  const complaintIndex = state.complaints.findIndex(c => c.id === id);
  if (complaintIndex === -1) return;
  
  const assignedShakhaCode = document.getElementById('assignShakha').value;
  const assignDate = document.getElementById('assignDate').value;
  const instructions = document.getElementById('assignInstructions').value;
  
  if (!assignedShakhaCode || !assignDate) {
    showToast('कृपया शाखा र मिति छान्नुहोस्', 'warning');
    return;
  }
  
  showLoadingIndicator(true);

  const assignedShakhaName = SHAKHA[assignedShakhaCode] || assignedShakhaCode;

  // Google Sheet मा अपडेट गर्न डाटा
  const updateData = {
    id: id,
    assignedShakha: assignedShakhaName,
    assignedDate: assignDate,
    instructions: instructions || '',
    status: 'progress',
    updatedBy: state.currentUser.name
  };

  // Google Sheet मा पठाउने
  const result = await postToGoogleSheets('updateComplaint', updateData);

  state.complaints[complaintIndex] = {
    ...state.complaints[complaintIndex],
    assignedShakha: assignedShakhaName,
    assignedDate: assignDate,
    instructions: instructions || '',
    status: 'progress',
    syncedToSheets: result && result.success
  };
  
  showToast('उजुरी शाखामा पठाइयो', 'success');
  showLoadingIndicator(false);
  
  if (result && result.success) {
    showToast('उजुरी शाखामा पठाइयो र Google Sheet मा अपडेट भयो', 'success');
  } else {
    showToast('उजुरी शाखामा पठाइयो (Local मात्र)', 'warning');
  }
  
  closeModal();
  showAdminComplaintsView();
}

function showTechnicalProjectsView() {
  state.currentView = 'technical_projects';
  document.getElementById('pageTitle').textContent = 'प्राविधिक परीक्षण';
  
  let technicalProjects = state.projects;
  if (state.currentUser && state.currentUser.role !== 'admin') {
    technicalProjects = technicalProjects.filter(p => p.shakha === SHAKHA[state.currentUser.shakha] || p.shakha === state.currentUser.shakha);
  }
  
  const content = `
    <div class="filter-bar mb-3">
      <div class="filter-group"><label class="filter-label">स्थिति:</label><select class="form-select form-select-sm" id="filterProjectStatus"><option value="">सबै</option><option value="active">चालु</option><option value="completed">सम्पन्न</option><option value="pending">काम बाँकी</option></select></div>
      <div class="filter-group"><input type="text" class="form-control form-control-sm" placeholder="खोज्नुहोस्..." id="projectSearchText" /></div>
      <button class="btn btn-primary btn-sm" onclick="filterProjects()">खोज्नुहोस्</button>
      <button class="btn btn-success btn-sm" onclick="exportToExcel('technical_projects')"><i class="fas fa-file-excel"></i> Excel</button>
      <button class="btn btn-primary btn-sm" onclick="showNewProjectModal()"><i class="fas fa-plus"></i> नयाँ आयोजना</button>
    </div>
    
    <div class="card">
      <div class="card-header"><h5 class="mb-0">प्राविधिक परीक्षण र आयोजना अनुगमन</h5></div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>क्र.सं.</th><th>आयोजनाको नाम</th><th>सम्बन्धित निकाय</th><th>अनुगमन/प्राविधिक परीक्षण मिति</th><th>अपरिपालनाहरु (NCR)</th><th>सुधारका लागि पत्रको मिति</th><th>सुधारको जानकारी प्राप्त मिति</th><th>कैफियत</th><th>कार्य</th></tr></thead>
            <tbody id="projectsTable">
              ${technicalProjects.map((project, index) => `
                <tr>
                  <td data-label="क्र.सं.">${index + 1}</td><td data-label="आयोजनाको नाम">${project.name}</td><td data-label="सम्बन्धित निकाय">${project.organization}</td><td data-label="अनुगमन/प्राविधिक परीक्षण मिति">${project.inspectionDate}</td>
                  <td data-label="अपरिपालनाहरु (NCR)" class="text-limit" title="${project.nonCompliances}">${project.nonCompliances.substring(0, 50)}...</td>
                  <td data-label="सुधारका लागि पत्रको मिति">${project.improvementLetterDate || '-'}</td><td data-label="सुधारको जानकारी प्राप्त मिति">${project.improvementInfo || '-'}</td><td data-label="कैफियत">${project.remarks || '-'}</td>
                  <td data-label="कार्य"><div class="table-actions"><button class="action-btn" data-action="viewProject" data-id="${project.id}" title="हेर्नुहोस्"><i class="fas fa-eye"></i></button><button class="action-btn" data-action="editProject" data-id="${project.id}" title="सम्पादन गर्नुहोस्"><i class="fas fa-edit"></i></button></div></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('contentArea').innerHTML = content;
  updateActiveNavItem();
}

function showNewProjectModal() {
  const currentDate = getCurrentNepaliDate();
  const formContent = `
    <div class="d-grid gap-3">
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group"><label class="form-label">आयोजनाको नाम *</label><input type="text" class="form-control" id="projectName" placeholder="आयोजनाको नाम" /></div>
        <div class="form-group"><label class="form-label">सम्बन्धित निकाय *</label><input type="text" class="form-control" id="projectOrganization" placeholder="सम्बन्धित निकायको नाम" /></div>
      </div>
      <div class="form-group"><label class="form-label">अनुगमन/प्राविधिक परीक्षण मिति *</label>
        <div class="d-flex gap-2 nepali-datepicker-dropdown" data-target="projectInspectionDate">
          <select id="projectInspectionDate_year" class="form-select bs-year"><option value="">साल</option></select>
          <select id="projectInspectionDate_month" class="form-select bs-month"><option value="">महिना</option></select>
          <select id="projectInspectionDate_day" class="form-select bs-day"><option value="">गते</option></select>
          <input type="hidden" id="projectInspectionDate" value="${currentDate}" />
        </div>
      </div>
      <div class="form-group"><label class="form-label">अपरिपालनाहरु (NCR) *</label><textarea class="form-control" rows="3" id="projectNonCompliances" placeholder="अपरिपालनाहरुको विवरण"></textarea></div>
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group"><label class="form-label">सुधारका लागि पत्र मिति</label>
          <div class="d-flex gap-2 nepali-datepicker-dropdown" data-target="projectImprovementLetterDate">
            <select id="projectImprovementLetterDate_year" class="form-select bs-year"><option value="">साल</option></select>
            <select id="projectImprovementLetterDate_month" class="form-select bs-month"><option value="">महिना</option></select>
            <select id="projectImprovementLetterDate_day" class="form-select bs-day"><option value="">गते</option></select>
            <input type="hidden" id="projectImprovementLetterDate" />
          </div>
        </div>
        <div class="form-group"><label class="form-label">स्थिति</label><select class="form-select" id="projectStatus"><option value="pending">काम बाँकी</option><option value="active">चालु</option><option value="completed">सम्पन्न</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">अपरिपालना सुधारको जानकारी</label><textarea class="form-control" rows="2" id="projectImprovementInfo" placeholder="अपरिपालना सुधारको जानकारी"></textarea></div>
      <div class="form-group"><label class="form-label">कैफियत</label><textarea class="form-control" rows="2" id="projectRemarks" placeholder="कैफियत"></textarea></div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">रद्द गर्नुहोस्</button><button class="btn btn-primary" onclick="saveTechnicalProject()">सुरक्षित गर्नुहोस्</button></div>
  `;
  
  openModal('नयाँ आयोजना', formContent);
  setTimeout(()=>{ initializeDatepickers(); initializeNepaliDropdowns(); }, 100);
}

function viewProject(id) {
  const project = state.projects.find(p => p.id === id);
  if (!project) { showToast('आयोजना फेला परेन', 'error'); return; }
  
  const statusText = project.status === 'active' ? 'चालु' : project.status === 'completed' ? 'सम्पन्न' : 'काम बाँकी';
  
  const content = `
    <div class="d-grid gap-3">
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div><div class="text-small text-muted">आयोजनाको नाम</div><div class="text-large">${project.name}</div></div>
        <div><div class="text-small text-muted">सम्बन्धित निकाय</div><div>${project.organization}</div></div>
        <div><div class="text-small text-muted">स्थिति</div><div><span class="status-badge ${project.status === 'active' ? 'status-progress' : project.status === 'completed' ? 'status-resolved' : 'status-pending'}">${statusText}</span></div></div>
      </div>
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div><div class="text-small text-muted">परीक्षण मिति</div><div>${project.inspectionDate}</div></div>
        <div><div class="text-small text-muted">सुधारको लागि पत्रको मिति</div><div>${project.improvementLetterDate || '-'}</div></div>
        <div><div class="text-small text-muted">शाखा</div><div>${project.shakha}</div></div>
      </div>
      <div><div class="text-small text-muted">अपरिपालनाहरु</div><div class="card p-3 bg-light">${project.nonCompliances}</div></div>
      <div><div class="text-small text-muted">अपरिपालना सुधारको जानकारी</div><div class="card p-3 bg-light">${project.improvementInfo || 'कुनै सुधार जानकारी छैन'}</div></div>
      <div><div class="text-small text-muted">कैफियत</div><div class="card p-3 bg-light">${project.remarks || 'कुनै कैफियत छैन'}</div></div>
    </div>
  `;
  
  openModal('आयोजना विवरण', content);
}

function editProject(id) {
  const project = state.projects.find(p => p.id === id);
  if (!project) return;
  
  const formContent = `
    <div class="d-grid gap-3">
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group"><label class="form-label">आयोजनाको नाम</label><input type="text" class="form-control" value="${project.name}" id="editProjectName" /></div>
        <div class="form-group"><label class="form-label">सम्बन्धित निकाय</label><input type="text" class="form-control" value="${project.organization}" id="editProjectOrganization" /></div>
      </div>
      <div class="form-group"><label class="form-label">अनुगमन/प्राविधिक परीक्षण मिति</label>
        <div class="d-flex gap-2 nepali-datepicker-dropdown" data-target="editProjectInspectionDate">
          <select id="editProjectInspectionDate_year" class="form-select bs-year"><option value="">साल</option></select>
          <select id="editProjectInspectionDate_month" class="form-select bs-month"><option value="">महिना</option></select>
          <select id="editProjectInspectionDate_day" class="form-select bs-day"><option value="">गते</option></select>
          <input type="hidden" id="editProjectInspectionDate" value="${project.inspectionDate}" />
        </div>
      </div>
      <div class="form-group"><label class="form-label">अपरिपालनाहरु (NCR)</label><textarea class="form-control" rows="3" id="editProjectNonCompliances">${project.nonCompliances}</textarea></div>
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group"><label class="form-label">अपरिपालना सुधारका लागि पत्रको मिति</label>
          <div class="d-flex gap-2 nepali-datepicker-dropdown" data-target="editProjectImprovementLetterDate">
            <select id="editProjectImprovementLetterDate_year" class="form-select bs-year"><option value="">साल</option></select>
            <select id="editProjectImprovementLetterDate_month" class="form-select bs-month"><option value="">महिना</option></select>
            <select id="editProjectImprovementLetterDate_day" class="form-select bs-day"><option value="">गते</option></select>
            <input type="hidden" id="editProjectImprovementLetterDate" value="${project.improvementLetterDate || ''}" />
          </div>
        </div>
        <div class="form-group"><label class="form-label">स्थिति</label><select class="form-select" id="editProjectStatus"><option value="pending" ${project.status === 'pending' ? 'selected' : ''}>काम बाँकी</option><option value="active" ${project.status === 'active' ? 'selected' : ''}>चालु</option><option value="completed" ${project.status === 'completed' ? 'selected' : ''}>सम्पन्न</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">अपरिपालना सुधारको जानकारी</label><textarea class="form-control" rows="2" id="editProjectImprovementInfo">${project.improvementInfo || ''}</textarea></div>
      <div class="form-group"><label class="form-label">कैफियत</label><textarea class="form-control" rows="2" id="editProjectRemarks">${project.remarks || ''}</textarea></div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">रद्द गर्नुहोस्</button><button class="btn btn-primary" onclick="saveProjectEdit('${id}')">सुरक्षित गर्नुहोस्</button></div>
  `;
  
  openModal('आयोजना सम्पादन', formContent);
  setTimeout(()=>{ initializeDatepickers(); initializeNepaliDropdowns(); }, 100);
}

function saveProjectEdit(id) {
  const projectIndex = state.projects.findIndex(p => p.id === id);
  if (projectIndex === -1) return;
  
  const updatedProject = {
    ...state.projects[projectIndex],
    name: document.getElementById('editProjectName').value,
    organization: document.getElementById('editProjectOrganization').value,
    inspectionDate: document.getElementById('editProjectInspectionDate').value,
    nonCompliances: document.getElementById('editProjectNonCompliances').value,
    improvementLetterDate: document.getElementById('editProjectImprovementLetterDate').value || '',
    status: document.getElementById('editProjectStatus').value,
    improvementInfo: document.getElementById('editProjectImprovementInfo').value || '',
    remarks: document.getElementById('editProjectRemarks').value || '',
    updatedAt: new Date().toISOString(),
    updatedBy: state.currentUser.name
  };
  
  state.projects[projectIndex] = updatedProject;
  showToast('आयोजना सुरक्षित गरियो', 'success');
  closeModal();
  showTechnicalProjectsView();
}

function showEmployeeMonitoringView() {
  state.currentView = 'employee_monitoring';
  document.getElementById('pageTitle').textContent = 'कार्यालय अनुगमन';
  
  const content = `
    <div class="filter-bar mb-3">
      <div class="filter-group"><label class="filter-label">मिति:</label>
        <div class="nepali-datepicker-dropdown" data-target="empStartDate" style="display:flex;gap:6px;">
          <select id="empStartDate_year" class="form-select form-select-sm bs-year" style="min-width:72px;"><option value="">साल</option></select>
          <select id="empStartDate_month" class="form-select form-select-sm bs-month" style="min-width:72px;"><option value="">महिना</option></select>
          <select id="empStartDate_day" class="form-select form-select-sm bs-day" style="min-width:72px;"><option value="">गते</option></select>
          <input type="hidden" id="empStartDate" />
        </div>
      </div>
      <div class="filter-group">
        <div class="nepali-datepicker-dropdown" data-target="empEndDate" style="display:flex;gap:6px;">
          <select id="empEndDate_year" class="form-select form-select-sm bs-year" style="min-width:72px;"><option value="">साल</option></select>
          <select id="empEndDate_month" class="form-select form-select-sm bs-month" style="min-width:72px;"><option value="">महिना</option></select>
          <select id="empEndDate_day" class="form-select form-select-sm bs-day" style="min-width:72px;"><option value="">गते</option></select>
          <input type="hidden" id="empEndDate" />
        </div>
      </div>
      <div class="filter-group"><input type="text" class="form-control form-control-sm" placeholder="निकाय खोज्नुहोस्..." id="empSearchText" /></div>
      <button class="btn btn-primary btn-sm" onclick="filterEmployeeMonitoring()">खोज्नुहोस्</button>
      <button class="btn btn-success btn-sm" onclick="exportToExcel('employee_monitoring')"><i class="fas fa-file-excel"></i> Excel</button>
      <button class="btn btn-primary btn-sm" onclick="showNewEmployeeMonitoring()"><i class="fas fa-plus"></i> नयाँ अनुगमन</button>
    </div>
    
    <div class="card">
      <div class="card-header"><h5 class="mb-0">कर्मचारीहरुको समयपालना र पोशाक अनुगमन</h5></div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>क्र.सं.</th><th>अनुगमन मिति</th><th>अनुगमन गरेको निकाय</th><th>तोकिएको पोशाक नलगाउने कर्मचारी</th><th>समय पालना नगर्ने कर्मचारी</th><th>निर्देशन मिति</th><th>कैफियत</th><th>कार्य</th></tr></thead>
            <tbody id="employeeMonitoringTable">
              ${state.employeeMonitoring.map((record, index) => `
                <tr>
                  <td data-label="क्र.सं.">${index + 1}</td><td data-label="अनुगमन मिति">${record.date}</td><td data-label="अनुगमन गरेको निकाय">${record.organization}</td><td data-label="तोकिएको पोशाक नलगाउने कर्मचारी">${record.uniformViolation}</td><td data-label="समय पालना नगर्ने कर्मचारी">${record.timeViolation}</td>
                  <td data-label="निर्देशन मिति">${record.instructionDate}</td><td data-label="कैफियत">${record.remarks}</td>
                  <td data-label="कार्य"><div class="table-actions"><button class="action-btn" data-action="viewEmployeeMonitoring" data-id="${record.id}" title="हेर्नुहोस्"><i class="fas fa-eye"></i></button><button class="action-btn" data-action="editEmployeeMonitoring" data-id="${record.id}" title="सम्पादन गर्नुहोस्"><i class="fas fa-edit"></i></button></div></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('contentArea').innerHTML = content;
  updateActiveNavItem();
  setTimeout(()=>{ initializeDatepickers(); initializeNepaliDropdowns(); }, 100);
}

function showNewEmployeeMonitoring() {
  const currentDate = getCurrentNepaliDate();
  const formContent = `
    <div class="d-grid gap-3">
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group"><label class="form-label">अनुगमन मिति *</label>
          <div class="d-flex gap-2 nepali-datepicker-dropdown" data-target="empDate">
            <select id="empDate_year" class="form-select bs-year"><option value="">साल</option></select>
            <select id="empDate_month" class="form-select bs-month"><option value="">महिना</option></select>
            <select id="empDate_day" class="form-select bs-day"><option value="">गते</option></select>
            <input type="hidden" id="empDate" value="${currentDate}" />
          </div>
        </div>
        <div class="form-group"><label class="form-label">निकाय *</label><input type="text" class="form-control" id="empOrganization" placeholder="निकायको नाम" /></div>
      </div>
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group"><label class="form-label">पोशाक अपरिपालना</label><input type="number" class="form-control" id="empUniformViolation" placeholder="०" min="0" /></div>
        <div class="form-group"><label class="form-label">समय अपरिपालना</label><input type="number" class="form-control" id="empTimeViolation" placeholder="०" min="0" /></div>
      </div>
      <div class="form-group"><label class="form-label">निर्देशन मिति</label>
        <div class="d-flex gap-2 nepali-datepicker-dropdown" data-target="empInstructionDate">
          <select id="empInstructionDate_year" class="form-select bs-year"><option value="">साल</option></select>
          <select id="empInstructionDate_month" class="form-select bs-month"><option value="">महिना</option></select>
          <select id="empInstructionDate_day" class="form-select bs-day"><option value="">गते</option></select>
          <input type="hidden" id="empInstructionDate" />
        </div>
      </div>
      <div class="form-group"><label class="form-label">कैफियत</label><textarea class="form-control" rows="3" id="empRemarks" placeholder="कैफियत"></textarea></div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">रद्द गर्नुहोस्</button><button class="btn btn-primary" onclick="saveEmployeeMonitoring()">सुरक्षित गर्नुहोस्</button></div>
  `;
  
  openModal('नयाँ कार्यालय अनुगमन', formContent);
  setTimeout(()=>{ initializeDatepickers(); initializeNepaliDropdowns(); }, 100);
}

async function saveEmployeeMonitoring() {
  const date = document.getElementById('empDate').value;
  const organization = document.getElementById('empOrganization').value;
  const uniformViolation = document.getElementById('empUniformViolation').value || '०';
  const timeViolation = document.getElementById('empTimeViolation').value || '०';
  const instructionDate = document.getElementById('empInstructionDate').value || '';
  const remarks = document.getElementById('empRemarks').value || '';
  
  if (!date || !organization) {
    showToast('कृपया मिति र निकाय भर्नुहोस्', 'warning');
    return;
  }
  
  showLoadingIndicator(true);

  const newRecord = {
    id: Date.now(), date, organization,
    uniformViolation, timeViolation,
    instructionDate, remarks,
    createdBy: state.currentUser.name,
    createdAt: new Date().toISOString()
  };
  
  // Google Sheet मा सेभ गर्ने
  const result = await postToGoogleSheets('saveEmployeeMonitoring', newRecord);
  
  if (result && result.success) {
    // Success logic if needed
  }

  state.employeeMonitoring.unshift(newRecord);
  showLoadingIndicator(false);
  showToast(result.success ? 'कार्यालय अनुगमन Google Sheet मा सुरक्षित गरियो' : 'कार्यालय अनुगमन Local मा सुरक्षित गरियो', result.success ? 'success' : 'warning');
  closeModal();
  showEmployeeMonitoringView();
}

function viewEmployeeMonitoring(id) {
  const record = state.employeeMonitoring.find(r => r.id === id);
  if (!record) { showToast('अभिलेख फेला परेन', 'error'); return; }
  
  const content = `
    <div class="d-grid gap-3">
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div><div class="text-small text-muted">अनुगमन मिति</div><div class="text-large">${record.date}</div></div>
        <div><div class="text-small text-muted">निकाय</div><div>${record.organization}</div></div>
      </div>
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div><div class="text-small text-muted">पोशाक अपरिपालना</div><div>${record.uniformViolation}</div></div>
        <div><div class="text-small text-muted">समय अपरिपालना</div><div>${record.timeViolation}</div></div>
      </div>
      <div><div class="text-small text-muted">निर्देशन मिति</div><div>${record.instructionDate}</div></div>
      <div><div class="text-small text-muted">कैफियत</div><div class="card p-3 bg-light">${record.remarks}</div></div>
    </div>
  `;
  
  openModal('कार्यालय अनुगमन विवरण', content);
}

function editEmployeeMonitoring(id) {
  const record = state.employeeMonitoring.find(r => r.id === id);
  if (!record) return;
  
  const formContent = `
    <div class="d-grid gap-3">
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group"><label class="form-label">अनुगमन मिति</label>
          <div class="d-flex gap-2 nepali-datepicker-dropdown" data-target="editEmpDate">
            <select id="editEmpDate_year" class="form-select bs-year"><option value="">साल</option></select>
            <select id="editEmpDate_month" class="form-select bs-month"><option value="">महिना</option></select>
            <select id="editEmpDate_day" class="form-select bs-day"><option value="">गते</option></select>
            <input type="hidden" id="editEmpDate" value="${record.date}" />
          </div>
        </div>
        <div class="form-group"><label class="form-label">निकाय</label><input type="text" class="form-control" value="${record.organization}" id="editEmpOrganization" /></div>
      </div>
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group"><label class="form-label">पोशाक अपरिपालना</label><input type="number" class="form-control" value="${record.uniformViolation}" id="editEmpUniformViolation" min="0" /></div>
        <div class="form-group"><label class="form-label">समय अपरिपालना</label><input type="number" class="form-control" value="${record.timeViolation}" id="editEmpTimeViolation" min="0" /></div>
      </div>
      <div class="form-group"><label class="form-label">निर्देशन मिति</label>
        <div class="d-flex gap-2 nepali-datepicker-dropdown" data-target="editEmpInstructionDate">
          <select id="editEmpInstructionDate_year" class="form-select bs-year"><option value="">साल</option></select>
          <select id="editEmpInstructionDate_month" class="form-select bs-month"><option value="">महिना</option></select>
          <select id="editEmpInstructionDate_day" class="form-select bs-day"><option value="">गते</option></select>
          <input type="hidden" id="editEmpInstructionDate" value="${record.instructionDate || ''}" />
        </div>
      </div>
      <div class="form-group"><label class="form-label">कैफियत</label><textarea class="form-control" rows="3" id="editEmpRemarks">${record.remarks}</textarea></div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">रद्द गर्नुहोस्</button><button class="btn btn-primary" onclick="saveEmployeeMonitoringEdit(${id})">सुरक्षित गर्नुहोस्</button></div>
  `;
  
  openModal('कार्यालय अनुगमन सम्पादन', formContent);
  setTimeout(()=>{ initializeDatepickers(); initializeNepaliDropdowns(); }, 100);
}

function saveEmployeeMonitoringEdit(id) {
  const recordIndex = state.employeeMonitoring.findIndex(r => r.id === id);
  if (recordIndex === -1) return;
  
  const updatedRecord = {
    ...state.employeeMonitoring[recordIndex],
    date: document.getElementById('editEmpDate').value,
    organization: document.getElementById('editEmpOrganization').value,
    uniformViolation: document.getElementById('editEmpUniformViolation').value || '०',
    timeViolation: document.getElementById('editEmpTimeViolation').value || '०',
    instructionDate: document.getElementById('editEmpInstructionDate').value || '',
    remarks: document.getElementById('editEmpRemarks').value || '',
    updatedAt: new Date().toISOString(),
    updatedBy: state.currentUser.name
  };
  
  state.employeeMonitoring[recordIndex] = updatedRecord;
  showToast('कार्यालय अनुगमन सुरक्षित गरियो', 'success');
  closeModal();
  showEmployeeMonitoringView();
}

function filterEmployeeMonitoring() {
  const searchText = document.getElementById('empSearchText')?.value.toLowerCase() || '';
  let filtered = state.employeeMonitoring;
  
  if (searchText) {
    filtered = filtered.filter(record => 
      record.organization.toLowerCase().includes(searchText) ||
      record.remarks.toLowerCase().includes(searchText)
    );
  }
  
  const tbody = document.getElementById('employeeMonitoringTable');
  if (tbody) {
    tbody.innerHTML = filtered.map((record, index) => `
      <tr>
        <td data-label="क्र.सं.">${index + 1}</td><td data-label="अनुगमन मिति">${record.date}</td><td data-label="अनुगमन गरेको निकाय">${record.organization}</td><td data-label="तोकिएको पोशाक नलगाउने कर्मचारी">${record.uniformViolation}</td>
        <td data-label="समय पालना नगर्ने कर्मचारी">${record.timeViolation}</td><td data-label="निर्देशन मिति">${record.instructionDate}</td><td data-label="कैफियत">${record.remarks}</td>
        <td data-label="कार्य"><div class="table-actions"><button class="action-btn" data-action="viewEmployeeMonitoring" data-id="${record.id}" title="हेर्नुहोस्"><i class="fas fa-eye"></i></button><button class="action-btn" data-action="editEmployeeMonitoring" data-id="${record.id}" title="सम्पादन गर्नुहोस्"><i class="fas fa-edit"></i></button></div></td>
      </tr>
    `).join('');
  }
}

function showCitizenCharterView() {
  state.currentView = 'citizen_charter';
  document.getElementById('pageTitle').textContent = 'नागरिक बडापत्र अनुगमन';
  
  const content = `
    <div class="card">
      <div class="card-header d-flex justify-between align-center">
        <h5 class="mb-0">नागरिक बडापत्र अनुगमन अभिलेख</h5>
        <button class="btn btn-primary btn-sm" onclick="showNewCitizenCharter()"><i class="fas fa-plus"></i> नयाँ अनुगमन</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>क्र.सं.</th><th>अनुगमन मिति</th><th>अनुगमन गरेको निकाय</th><th>नागरिक बडापत्र अनुगमनबाट देखिएको अवस्था</th><th>केन्द्रबाट दिइएको निर्देशन</th><th>निर्देशन मिति</th><th>कैफियत</th><th>कार्य</th></tr></thead>
            <tbody>
              ${state.citizenCharters.map((record, index) => `
                <tr>
                  <td data-label="क्र.सं.">${index + 1}</td><td data-label="अनुगमन मिति">${record.date}</td><td data-label="अनुगमन गरेको निकाय">${record.organization}</td><td data-label="नागरिक बडापत्र अनुगमनबाट देखिएको अवस्था">${record.findings}</td>
                  <td data-label="केन्द्रबाट दिइएको निर्देशन">${record.instructions}</td><td data-label="निर्देशन मिति">${record.instructionDate}</td><td data-label="कैफियत">${record.remarks}</td>
                  <td data-label="कार्य"><div class="table-actions"><button class="action-btn" data-action="viewCitizenCharter" data-id="${record.id}" title="हेर्नुहोस्"><i class="fas fa-eye"></i></button><button class="action-btn" data-action="editCitizenCharter" data-id="${record.id}" title="सम्पादन गर्नुहोस्"><i class="fas fa-edit"></i></button></div></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('contentArea').innerHTML = content;
  updateActiveNavItem();
}

function showNewCitizenCharter() {
  const currentDate = getCurrentNepaliDate();
  const formContent = `
    <div class="d-grid gap-3">
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group"><label class="form-label">अनुगमन मिति *</label>
          <div class="d-flex gap-2 nepali-datepicker-dropdown" data-target="ccDate">
            <select id="ccDate_year" class="form-select bs-year"><option value="">साल</option></select>
            <select id="ccDate_month" class="form-select bs-month"><option value="">महिना</option></select>
            <select id="ccDate_day" class="form-select bs-day"><option value="">गते</option></select>
            <input type="hidden" id="ccDate" value="${currentDate}" />
          </div>
        </div>
        <div class="form-group"><label class="form-label">निकाय *</label><input type="text" class="form-control" id="ccOrganization" placeholder="निकायको नाम" /></div>
      </div>
      <div class="form-group"><label class="form-label">अनुगमनबाट देखिएको अवस्था *</label><textarea class="form-control" rows="3" id="ccFindings" placeholder="अनुगमनबाट देखिएको अवस्था"></textarea></div>
      <div class="form-group"><label class="form-label">केन्द्रबाट दिइएको निर्देशन *</label><textarea class="form-control" rows="3" id="ccInstructions" placeholder="निर्देशन"></textarea></div>
      <div class="form-group"><label class="form-label">निर्देशन मिति</label>
        <div class="d-flex gap-2 nepali-datepicker-dropdown" data-target="ccInstructionDate">
          <select id="ccInstructionDate_year" class="form-select bs-year"><option value="">साल</option></select>
          <select id="ccInstructionDate_month" class="form-select bs-month"><option value="">महिना</option></select>
          <select id="ccInstructionDate_day" class="form-select bs-day"><option value="">गते</option></select>
          <input type="hidden" id="ccInstructionDate" />
        </div>
      </div>
      <div class="form-group"><label class="form-label">कैफियत</label><textarea class="form-control" rows="2" id="ccRemarks" placeholder="कैफियत"></textarea></div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">रद्द गर्नुहोस्</button><button class="btn btn-primary" onclick="saveCitizenCharter()">सुरक्षित गर्नुहोस्</button></div>
  `;
  
  openModal('नयाँ नागरिक बडापत्र अनुगमन', formContent);
  setTimeout(()=>{ initializeDatepickers(); initializeNepaliDropdowns(); }, 100);
}

async function saveCitizenCharter() {
  const date = document.getElementById('ccDate').value;
  const organization = document.getElementById('ccOrganization').value;
  const findings = document.getElementById('ccFindings').value;
  const instructions = document.getElementById('ccInstructions').value;
  const instructionDate = document.getElementById('ccInstructionDate').value || '';
  const remarks = document.getElementById('ccRemarks').value || '';
  
  if (!date || !organization || !findings || !instructions) {
    showToast('कृपया आवश्यक फिल्डहरू भर्नुहोस्', 'warning');
    return;
  }
  
  showLoadingIndicator(true);

  const newRecord = {
    id: Date.now(), date, organization, findings, instructions,
    instructionDate, remarks,
    createdBy: state.currentUser.name,
    createdAt: new Date().toISOString()
  };
  
  // Google Sheet मा सेभ गर्ने
  const result = await postToGoogleSheets('saveCitizenCharter', newRecord);
  
  if (result && result.success) {
    // Success logic if needed
  }

  state.citizenCharters.unshift(newRecord);
  showLoadingIndicator(false);
  showToast(result.success ? 'नागरिक बडापत्र अनुगमन Google Sheet मा सुरक्षित गरियो' : 'नागरिक बडापत्र अनुगमन Local मा सुरक्षित गरियो', result.success ? 'success' : 'warning');
  closeModal();
  showCitizenCharterView();
}

function viewCitizenCharter(id) {
  const record = state.citizenCharters.find(r => r.id === id);
  if (!record) { showToast('अभिलेख फेला परेन', 'error'); return; }
  
  const content = `
    <div class="d-grid gap-3">
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div><div class="text-small text-muted">अनुगमन मिति</div><div class="text-large">${record.date}</div></div>
        <div><div class="text-small text-muted">निकाय</div><div>${record.organization}</div></div>
      </div>
      <div><div class="text-small text-muted">अनुगमनबाट देखिएको अवस्था</div><div class="card p-3 bg-light">${record.findings}</div></div>
      <div><div class="text-small text-muted">केन्द्रबाट दिएको निर्देशन</div><div class="card p-3 bg-light">${record.instructions}</div></div>
      <div><div class="text-small text-muted">निर्देशन मिति</div><div>${record.instructionDate}</div></div>
      <div><div class="text-small text-muted">कैफियत</div><div class="card p-3 bg-light">${record.remarks || 'कुनै कैफियत छैन'}</div></div>
    </div>
  `;
  
  openModal('नागरिक बडापत्र अनुगमन विवरण', content);
}

function editCitizenCharter(id) {
  const record = state.citizenCharters.find(r => r.id === id);
  if (!record) return;
  
  const formContent = `
    <div class="d-grid gap-3">
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group"><label class="form-label">अनुगमन मिति</label>
          <div class="d-flex gap-2 nepali-datepicker-dropdown" data-target="editCcDate">
            <select id="editCcDate_year" class="form-select bs-year"><option value="">साल</option></select>
            <select id="editCcDate_month" class="form-select bs-month"><option value="">महिना</option></select>
            <select id="editCcDate_day" class="form-select bs-day"><option value="">गते</option></select>
            <input type="hidden" id="editCcDate" value="${record.date}" />
          </div>
        </div>
        <div class="form-group"><label class="form-label">निकाय</label><input type="text" class="form-control" value="${record.organization}" id="editCcOrganization" /></div>
      </div>
      <div class="form-group"><label class="form-label">अनुगमनबाट देखिएको अवस्था</label><textarea class="form-control" rows="3" id="editCcFindings">${record.findings}</textarea></div>
      <div class="form-group"><label class="form-label">केन्द्रबाट दिएको निर्देशन</label><textarea class="form-control" rows="3" id="editCcInstructions">${record.instructions}</textarea></div>
      <div class="form-group"><label class="form-label">निर्देशन मिति</label>
        <div class="d-flex gap-2 nepali-datepicker-dropdown" data-target="editCcInstructionDate">
          <select id="editCcInstructionDate_year" class="form-select bs-year"><option value="">साल</option></select>
          <select id="editCcInstructionDate_month" class="form-select bs-month"><option value="">महिना</option></select>
          <select id="editCcInstructionDate_day" class="form-select bs-day"><option value="">गते</option></select>
          <input type="hidden" id="editCcInstructionDate" value="${record.instructionDate || ''}" />
        </div>
      </div>
      <div class="form-group"><label class="form-label">कैफियत</label><textarea class="form-control" rows="2" id="editCcRemarks">${record.remarks || ''}</textarea></div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">रद्द गर्नुहोस्</button><button class="btn btn-primary" onclick="saveCitizenCharterEdit(${id})">सुरक्षित गर्नुहोस्</button></div>
  `;
  
  openModal('नागरिक बडापत्र अनुगमन सम्पादन', formContent);
  setTimeout(()=>{ initializeDatepickers(); initializeNepaliDropdowns(); }, 100);
}

function saveCitizenCharterEdit(id) {
  const recordIndex = state.citizenCharters.findIndex(r => r.id === id);
  if (recordIndex === -1) return;
  
  const updatedRecord = {
    ...state.citizenCharters[recordIndex],
    date: document.getElementById('editCcDate').value,
    organization: document.getElementById('editCcOrganization').value,
    findings: document.getElementById('editCcFindings').value,
    instructions: document.getElementById('editCcInstructions').value,
    instructionDate: document.getElementById('editCcInstructionDate').value || '',
    remarks: document.getElementById('editCcRemarks').value || '',
    updatedAt: new Date().toISOString(),
    updatedBy: state.currentUser.name
  };
  
  state.citizenCharters[recordIndex] = updatedRecord;
  showToast('नागरिक बडापत्र अनुगमन सुरक्षित गरियो', 'success');
  closeModal();
  showCitizenCharterView();
}

function showReportsView() {
  state.currentView = 'reports';
  document.getElementById('pageTitle').textContent = 'रिपोर्टहरू';
  
  const content = `
    <div class="card">
      <div class="card-header"><h5 class="mb-0">रिपोर्ट जेनरेटर</h5></div>
      <div class="card-body">
        <div class="d-grid gap-3 mb-4" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
          <button class="btn btn-outline d-flex flex-column align-center p-3" onclick="generateMonthlyReport()"><i class="fas fa-calendar-alt fa-2x mb-2"></i><div class="text-small">मासिक रिपोर्ट</div><div class="text-xs text-muted">मासिक उजुरी विवरण</div></button>
          <button class="btn btn-outline d-flex flex-column align-center p-3" onclick="generateShakhaReport()"><i class="fas fa-building fa-2x mb-2"></i><div class="text-small">शाखा रिपोर्ट</div><div class="text-xs text-muted">शाखा अनुसारको प्रदर्शन</div></button>
          <button class="btn btn-outline d-flex flex-column align-center p-3" onclick="generateSummaryReport()"><i class="fas fa-chart-pie fa-2x mb-2"></i><div class="text-small">सारांश रिपोर्ट</div><div class="text-xs text-muted">समग्र विश्लेषण</div></button>
          <button class="btn btn-outline d-flex flex-column align-center p-3" onclick="exportToExcel('all_complaints')"><i class="fas fa-file-excel fa-2x mb-2"></i><div class="text-small">Excel एक्सपोर्ट</div><div class="text-xs text-muted">सबै उजुरीहरू</div></button>
          <button class="btn btn-outline d-flex flex-column align-center p-3" style="border-color: #764ba2; color: #764ba2;" onclick="generateAIReport()"><i class="fas fa-robot fa-2x mb-2"></i><div class="text-small">AI रिपोर्ट</div><div class="text-xs text-muted">स्वत: विश्लेषण</div></button>
        </div>
        
        <div class="mt-4">
          <h6 class="mb-2">कस्टमाइज्ड रिपोर्ट</h6>
          <div class="d-grid gap-3" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
            <div class="form-group"><label class="form-label">सुरु मिति</label>
              <div class="nepali-datepicker-dropdown" data-target="reportStartDate" style="display:flex;gap:6px;">
                <select id="reportStartDate_year" class="form-select bs-year" style="min-width:96px;"><option value="">साल</option></select>
                <select id="reportStartDate_month" class="form-select bs-month" style="min-width:96px;"><option value="">महिना</option></select>
                <select id="reportStartDate_day" class="form-select bs-day" style="min-width:96px;"><option value="">गते</option></select>
                <input type="hidden" id="reportStartDate" />
              </div>
            </div>
            <div class="form-group"><label class="form-label">अन्त्य मिति</label>
              <div class="nepali-datepicker-dropdown" data-target="reportEndDate" style="display:flex;gap:6px;">
                <select id="reportEndDate_year" class="form-select bs-year" style="min-width:96px;"><option value="">साल</option></select>
                <select id="reportEndDate_month" class="form-select bs-month" style="min-width:96px;"><option value="">महिना</option></select>
                <select id="reportEndDate_day" class="form-select bs-day" style="min-width:96px;"><option value="">गते</option></select>
                <input type="hidden" id="reportEndDate" />
              </div>
            </div>
            <div class="form-group"><label class="form-label">स्थिति</label><select class="form-select" id="reportStatus"><option value="">सबै</option><option value="pending">काम बाँकी</option><option value="resolved">फछ्रयौट</option></select></div>
            <div class="form-group d-flex align-end"><button class="btn btn-primary w-100" onclick="generateCustomReport()">रिपोर्ट जेनरेट गर्नुहोस्</button></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('contentArea').innerHTML = content;
  updateActiveNavItem();
  setTimeout(()=>{ initializeDatepickers(); initializeNepaliDropdowns(); }, 100);
}

function getShakhaName(code) {
  return SHAKHA[code] || code;
}

function showShakhaReportsView() {
  state.currentView = 'shakha_reports';
  document.getElementById('pageTitle').textContent = 'शाखागत रिपोर्टहरू';
  
  const shakhaStats = {};
  state.complaints.forEach(complaint => {
    const shakha = complaint.shakha || 'अन्य';
    if (!shakhaStats[shakha]) shakhaStats[shakha] = { total: 0, pending: 0, resolved: 0, progress: 0, closed: 0 };
    shakhaStats[shakha].total++;
    if (complaint.status === 'pending') shakhaStats[shakha].pending++;
    if (complaint.status === 'resolved') shakhaStats[shakha].resolved++;
    if (complaint.status === 'progress') shakhaStats[shakha].progress++;
    if (complaint.status === 'closed') shakhaStats[shakha].closed++;
  });
  
  const content = `
    <div class="card">
      <div class="card-header d-flex justify-between align-center">
        <h5 class="mb-0">शाखा अनुसार उजुरी विवरण</h5>
        <button class="btn btn-success btn-sm" onclick="exportToExcel('shakha_reports')"><i class="fas fa-file-excel"></i> Excel</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>शाखा</th><th>कूल उजुरी</th><th>काम बाँकी</th><th>चालु</th><th>फछ्रयौट</th><th>फछ्रयौट दर</th><th>कार्य</th></tr></thead>
            <tbody>
              ${Object.keys(shakhaStats).map(shakha => {
                const stats = shakhaStats[shakha];
                const shakhaName = getShakhaName(shakha);
                const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
                return `<tr><td data-label="शाखा">${shakhaName}</td><td data-label="कूल उजुरी">${stats.total}</td><td data-label="काम बाँकी"><span class="text-warning">${stats.pending}</span></td><td data-label="चालु"><span class="text-info">${stats.progress}</span></td><td data-label="फछ्रयौट"><span class="text-success">${stats.resolved}</span></td><td data-label="फछ्रयौट दर">${resolutionRate}%</td><td data-label="कार्य"><button class="action-btn" data-action="viewShakhaDetails" data-id="${shakha}" title="विस्तृत हेर्नुहोस्"><i class="fas fa-chart-bar"></i></button></td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <div class="card mt-3">
      <div class="card-header"><h5 class="mb-0">शाखा अनुसार उजुरी तुलना</h5></div>
      <div class="card-body" style="height: 350px; position: relative;"><canvas id="shakhaComparisonChart"></canvas></div>
    </div>
  `;
  
  document.getElementById('contentArea').innerHTML = content;
  updateActiveNavItem();
  
  setTimeout(() => {
    if (typeof Chart !== 'undefined') {
      const ctx = document.getElementById('shakhaComparisonChart');
      if (ctx) {
        const shakhas = Object.keys(shakhaStats);
        const pendingData = shakhas.map(shakha => shakhaStats[shakha].pending);
        const resolvedData = shakhas.map(shakha => shakhaStats[shakha].resolved);
        
        window.nvcChartsData.comparisonChart = {
            labels: shakhas,
            datasets: [
              { label: 'काम बाँकी', data: pendingData, backgroundColor: 'rgba(255, 143, 0, 0.8)', borderColor: 'rgba(255, 143, 0, 1)', borderWidth: 1, borderRadius: 5 },
              { label: 'फछ्रयौट', data: resolvedData, backgroundColor: 'rgba(46, 125, 50, 0.8)', borderColor: 'rgba(46, 125, 50, 1)', borderWidth: 1, borderRadius: 5 }
            ]
        };

        if (window.nvcCharts.comparisonChart) window.nvcCharts.comparisonChart.destroy();
        
        window.nvcCharts.comparisonChart = new Chart(ctx, {
          type: window.nvcChartsType.comparisonChart || 'bar',
          data: window.nvcChartsData.comparisonChart,
          options: {
            indexAxis: 'y',
            responsive: true, 
            maintainAspectRatio: false,
            onClick: (evt, elements, chart) => {
                if (elements.length > 0) {
                    const i = elements[0].index;
                    const label = chart.data.labels[i];
                    showChartDrillDown({ shakha: label }, `${label} शाखाको विवरण`);
                }
            },
            scales: {
              x: { beginAtZero: true, title: { display: true, text: 'उजुरी संख्या' } },
              y: { title: { display: true, text: 'शाखाहरू' } }
            }
          }
        });
      }
    }
  }, 100);
}

function showSystemReportsView() {
  state.currentView = 'system_reports';
  document.getElementById('pageTitle').textContent = 'सिस्टम रिपोर्टहरू';
  
  const resolutionRate = state.complaints.length > 0 ? 
    Math.round((state.complaints.filter(c => c.status === 'resolved').length / state.complaints.length) * 100) : 0;
  
  const resolvedCount = state.complaints.filter(c => c.status === 'resolved').length;

  const content = `
    <div class="card">
      <div class="card-header"><h5 class="mb-0">प्रणाली विश्लेषण रिपोर्टहरू</h5></div>
      <div class="card-body">
        <div class="d-grid gap-3 mb-4" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
          <div class="infocard" onclick="generatePerformanceReport()"><div class="infocard-icon"><i class="fas fa-chart-line"></i></div><div class="infocard-value">${state.complaints.length}</div><div class="infocard-label">कूल उजुरीहरू</div><div class="text-xs text-success mt-1"></div></div>
          <div class="infocard" onclick="generateResolutionReport()"><div class="infocard-icon"><i class="fas fa-check-circle"></i></div><div class="infocard-value">${resolutionRate}%</div><div class="infocard-label">फछ्रयौट दर</div><div class="text-xs text-success mt-1"></div></div>
          <div class="infocard"><div class="infocard-icon"><i class="fas fa-check-double"></i></div><div class="infocard-value">${resolvedCount}</div><div class="infocard-label">फछ्रयौट भएका उजुरी</div><div class="text-xs text-success mt-1"></div></div>
          <div class="infocard" onclick="generateUserActivityReport()"><div class="infocard-icon"><i class="fas fa-users"></i></div><div class="infocard-value">${state.users.length}</div><div class="infocard-label">सक्रिय प्रयोगकर्ता</div><div class="text-xs text-success mt-1"></div></div>
        </div>
        
        <div class="d-grid gap-3" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
          <div class="chart-container"><div class="chart-header d-flex justify-between align-center"><h6 class="chart-title">महिना अनुसार उजुरीहरू</h6>${getChartActionsHTML('monthlyTrendChart')}</div><div class="chart-wrapper"><canvas id="monthlyTrendChart"></canvas></div></div>
          <div class="chart-container"><div class="chart-header d-flex justify-between align-center"><h6 class="chart-title">शाखा अनुसार फछ्रयौट दर</h6>${getChartActionsHTML('resolutionRateChart')}</div><div class="chart-wrapper"><canvas id="resolutionRateChart"></canvas></div></div>
        </div>
        
        <div class="mt-4"><button class="btn btn-primary" onclick="exportSystemReport()"><i class="fas fa-file-pdf"></i> पूर्ण प्रणाली रिपोर्ट डाउनलोड गर्नुहोस्</button></div>
      </div>
    </div>
  `;
  
  document.getElementById('contentArea').innerHTML = content;
  updateActiveNavItem();
  
  setTimeout(() => {
    if (typeof Chart !== 'undefined') {
      const monthlyCtx = document.getElementById('monthlyTrendChart');
      if (monthlyCtx) {
        // Calculate monthly data
        const nepaliMonths = ['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत'];
        const monthlyData = new Array(12).fill(0);
        let currentNYear = 2081;
        try {
            const nDate = getCurrentNepaliDate();
            if(nDate) currentNYear = parseInt(nDate.split('-')[0]);
        } catch(e){}

        state.complaints.forEach(c => {
            if (!c.date) return;
            const parts = c.date.split('-');
            if (parts.length >= 2) {
                const y = parseInt(parts[0]);
                const m = parseInt(parts[1]);
                if (y === currentNYear && m >= 1 && m <= 12) {
                    monthlyData[m-1]++;
                }
            }
        });

        window.nvcChartsData.monthlyTrendChart = {
            labels: nepaliMonths,
            datasets: [{
              label: 'उजुरीहरू',
              data: monthlyData,
              borderColor: 'rgba(13, 71, 161, 1)',
              backgroundColor: 'rgba(13, 71, 161, 0.7)',
              borderWidth: 1,
              borderRadius: 4
            }]
        };

        if (window.nvcCharts.monthlyTrendChart) window.nvcCharts.monthlyTrendChart.destroy();
        window.nvcCharts.monthlyTrendChart = new Chart(monthlyCtx, {
          type: window.nvcChartsType.monthlyTrendChart || 'bar',
          data: window.nvcChartsData.monthlyTrendChart,
          options: { responsive: true, maintainAspectRatio: false }
        });
      }
      
      const resolutionCtx = document.getElementById('resolutionRateChart');
      if (resolutionCtx) {
        const shakhaStats = {};
        state.complaints.forEach(complaint => {
          const shakha = complaint.shakha || 'अन्य';
          if (!shakhaStats[shakha]) shakhaStats[shakha] = { total: 0, resolved: 0 };
          shakhaStats[shakha].total++;
          if (complaint.status === 'resolved') shakhaStats[shakha].resolved++;
        });
        
        const shakhas = Object.keys(shakhaStats);
        const rates = shakhas.map(shakha => {
          const stats = shakhaStats[shakha];
          return stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
        });
        
        window.nvcChartsData.resolutionRateChart = {
            labels: shakhas,
            datasets: [{
              label: 'फछ्रयौट दर (%)',
              data: rates,
              backgroundColor: 'rgba(46, 125, 50, 0.8)',
              borderColor: 'rgba(46, 125, 50, 1)',
              borderWidth: 1
            }]
        };

        if (window.nvcCharts.resolutionRateChart) window.nvcCharts.resolutionRateChart.destroy();
        window.nvcCharts.resolutionRateChart = new Chart(resolutionCtx, {
          type: window.nvcChartsType.resolutionRateChart || 'bar',
          data: window.nvcChartsData.resolutionRateChart,
          options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'फछ्रयौट दर (%)' } } }
          }
        });
      }
    }
  }, 100);
}

function showUserManagementView() {
  state.currentView = 'user_management';
  document.getElementById('pageTitle').textContent = 'प्रयोगकर्ता व्यवस्थापन';
  
  const content = `
    <div class="card">
      <div class="card-header d-flex justify-between align-center">
        <h5 class="mb-0">प्रयोगकर्ता सूची</h5>
        <button class="btn btn-primary btn-sm" onclick="showNewUserModal()"><i class="fas fa-plus"></i> नयाँ प्रयोगकर्ता</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>क्र.सं.</th><th>युजरनेम</th><th>नाम</th><th>भूमिका</th><th>स्थिति</th><th>अन्तिम लगइन</th><th>कार्य</th></tr></thead>
            <tbody>
              ${state.users.map((user, index) => `
                <tr>
                  <td data-label="क्र.सं.">${index + 1}</td><td data-label="युजरनेम">${user.username}</td><td data-label="नाम">${user.name}</td><td data-label="भूमिका">${user.role}</td>
                  <td data-label="स्थिति"><span class="status-badge ${user.status === 'सक्रिय' ? 'status-resolved' : 'status-pending'}">${user.status}</span></td>
                  <td data-label="अन्तिम लगइन">${user.lastLogin}</td>
                  <td data-label="कार्य"><div class="table-actions"><button class="action-btn" data-action="editUser" data-id="${user.id}" title="सम्पादन गर्नुहोस्"><i class="fas fa-edit"></i></button><button class="action-btn" data-action="resetUserPassword" data-id="${user.id}" title="पासवर्ड रिसेट"><i class="fas fa-key"></i></button><button class="action-btn" data-action="toggleUserStatus" data-id="${user.id}" title="निष्क्रिय गर्नुहोस्"><i class="fas fa-ban"></i></button></div></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('contentArea').innerHTML = content;
  updateActiveNavItem();
}

function generateAIReport() {
    showLoadingIndicator(true);
    setTimeout(() => {
        const reportText = AI_SYSTEM.generateReport(state.complaints);
        showToast('AI रिपोर्ट तयार भयो', 'success');
        openModal('AI विश्लेषण रिपोर्ट', `<div class="p-3"><div class="ai-analysis-box"><i class="fas fa-robot"></i> <strong>AI Insight:</strong><br><br>${reportText}</div><button class="btn btn-primary btn-sm mt-2" onclick="closeModal()">बन्द गर्नुहोस्</button></div>`);
        showLoadingIndicator(false);
    }, 1500);
}

function showNewUserModal() {
  const formContent = `
    <div class="d-grid gap-3">
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group"><label class="form-label">युजरनेम *</label><input type="text" class="form-control" id="newUsername" placeholder="युजरनेम" /></div>
        <div class="form-group"><label class="form-label">पासवर्ड *</label><input type="password" class="form-control" id="newPassword" placeholder="पासवर्ड" /></div>
      </div>
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group"><label class="form-label">नाम *</label><input type="text" class="form-control" id="newName" placeholder="पूरा नाम" /></div>
        <div class="form-group"><label class="form-label">भूमिका *</label><select class="form-select" id="newRole"><option value="">छान्नुहोस्</option><option value="admin">एडमिन</option><option value="shakha">शाखा</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">शाखा (यदि शाखा हो भने)</label><select class="form-select" id="newShakha"><option value="">छान्नुहोस्</option>${Object.entries(SHAKHA).map(([key, value]) => `<option value="${key}">${value}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">स्थिति</label><select class="form-select" id="newStatus"><option value="सक्रिय">सक्रिय</option><option value="निष्क्रिय">निष्क्रिय</option></select></div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">रद्द गर्नुहोस्</button><button class="btn btn-primary" onclick="saveNewUser()">सुरक्षित गर्नुहोस्</button></div>
  `;
  
  openModal('नयाँ प्रयोगकर्ता', formContent);
}

function saveNewUser() {
  const username = document.getElementById('newUsername').value;
  const password = document.getElementById('newPassword').value;
  const name = document.getElementById('newName').value;
  const role = document.getElementById('newRole').value;
  const shakha = document.getElementById('newShakha').value;
  const status = document.getElementById('newStatus').value;
  
  if (!username || !password || !name || !role) {
    showToast('कृपया आवश्यक फिल्डहरू भर्नुहोस्', 'warning');
    return;
  }
  
  if (role === 'shakha' && !shakha) {
    showToast('कृपया शाखा छान्नुहोस्', 'warning');
    return;
  }
  
  const newUser = {
    id: Date.now(), username, password, name,
    role: role === 'admin' ? 'एडमिन' : 'शाखा',
    shakha: role === 'shakha' ? shakha : null,
    status, lastLogin: '-',
    createdBy: state.currentUser.name,
    createdAt: new Date().toISOString()
  };
  
  state.users.push(newUser);
  showToast('नयाँ प्रयोगकर्ता सुरक्षित गरियो', 'success');
  closeModal();
  showUserManagementView();
}

function editUser(id) {
  const user = state.users.find(u => u.id === id);
  if (!user) return;
  
  const formContent = `
    <div class="d-grid gap-3">
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group"><label class="form-label">युजरनेम</label><input type="text" class="form-control" value="${user.username}" id="editUsername" readonly /></div>
        <div class="form-group"><label class="form-label">पासवर्ड</label><input type="password" class="form-control" id="editPassword" placeholder="नयाँ पासवर्ड (खाली छोड्नुहोस्)" /></div>
      </div>
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="form-group"><label class="form-label">नाम</label><input type="text" class="form-control" value="${user.name}" id="editName" /></div>
        <div class="form-group"><label class="form-label">भूमिका</label><select class="form-select" id="editRole"><option value="admin" ${user.role === 'एडमिन' ? 'selected' : ''}>एडमिन</option><option value="shakha" ${user.role === 'शाखा' ? 'selected' : ''}>शाखा</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">शाखा (यदि शाखा हो भने)</label><select class="form-select" id="editShakha"><option value="">छान्नुहोस्</option>${Object.entries(SHAKHA).map(([key, value]) => `<option value="${key}" ${user.shakha === key ? 'selected' : ''}>${value}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">स्थिति</label><select class="form-select" id="editStatus"><option value="सक्रिय" ${user.status === 'सक्रिय' ? 'selected' : ''}>सक्रिय</option><option value="निष्क्रिय" ${user.status === 'निष्क्रिय' ? 'selected' : ''}>निष्क्रिय</option></select></div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">रद्द गर्नुहोस्</button><button class="btn btn-primary" onclick="saveUserEdit(${id})">सुरक्षित गर्नुहोस्</button></div>
  `;
  
  openModal('प्रयोगकर्ता सम्पादन', formContent);
}

function saveUserEdit(id) {
  const userIndex = state.users.findIndex(u => u.id === id);
  if (userIndex === -1) return;
  
  const name = document.getElementById('editName').value;
  const password = document.getElementById('editPassword').value;
  const role = document.getElementById('editRole').value;
  const shakha = document.getElementById('editShakha').value;
  const status = document.getElementById('editStatus').value;
  
  if (!name) {
    showToast('कृपया नाम भर्नुहोस्', 'warning');
    return;
  }
  
  if (role === 'shakha' && !shakha) {
    showToast('कृपया शाखा छान्नुहोस्', 'warning');
    return;
  }
  
  const updatedUser = {
    ...state.users[userIndex],
    name, role: role === 'admin' ? 'एडमिन' : 'शाखा',
    shakha: role === 'shakha' ? shakha : null, status
  };
  
  if (password) updatedUser.password = password;
  
  state.users[userIndex] = updatedUser;
  showToast('प्रयोगकर्ता सुरक्षित गरियो', 'success');
  closeModal();
  showUserManagementView();
}

function resetUserPassword(id) {
  if (confirm('के तपाईं यस प्रयोगकर्ताको पासवर्ड रिसेट गर्न चाहनुहुन्छ?')) {
    const userIndex = state.users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      state.users[userIndex].password = 'nvc@2024';
      showToast('पासवर्ड रिसेट गरियो (नयाँ पासवर्ड: nvc@2024)', 'success');
      showUserManagementView();
    }
  }
}

function toggleUserStatus(id) {
  const userIndex = state.users.findIndex(u => u.id === id);
  if (userIndex === -1) return;
  
  const currentStatus = state.users[userIndex].status;
  const newStatus = currentStatus === 'सक्रिय' ? 'निष्क्रिय' : 'सक्रिय';
  
  if (confirm(`के तपाईं यस प्रयोगकर्तालाई ${newStatus} गर्न चाहनुहुन्छ?`)) {
    state.users[userIndex].status = newStatus;
    showToast(`प्रयोगकर्ता ${newStatus} गरियो`, 'success');
    showUserManagementView();
  }
}

function showSettingsView() {
  state.currentView = 'settings';
  document.getElementById('pageTitle').textContent = 'सेटिङहरू';
  
  const content = `
    <div class="card mb-3">
      <div class="card-header"><h5 class="mb-0">युजर सेटिङहरू</h5></div>
      <div class="card-body">
        <div class="d-grid gap-3" style="max-width: 500px;">
          <div class="form-group"><label class="form-label">पुरानो पासवर्ड</label><input type="password" class="form-control" /></div>
          <div class="form-group"><label class="form-label">नयाँ पासवर्ड</label><input type="password" class="form-control" /></div>
          <div class="form-group"><label class="form-label">पासवर्ड पुष्टि</label><input type="password" class="form-control" /></div>
          <button class="btn btn-primary">पासवर्ड परिवर्तन गर्नुहोस्</button>
        </div>
      </div>
    </div>
    
    <div class="card mb-3">
      <div class="card-header"><h5 class="mb-0">प्रणाली सेटिङहरू</h5></div>
      <div class="card-body">
        <div class="d-grid gap-3">
          <div class="form-group"><label class="form-label">प्रदर्शन मोड</label>
            <select class="form-select" onchange="applyTheme(this.value)">
                <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>हल्का (Light)</option>
                <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>अँध्यारो (Dark)</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">प्रदर्शन मोड</label><select class="form-select"><option>हल्का</option><option>अँध्यारो</option><option>स्वचालित</option></select></div>
          <div class="form-group"><label class="form-label">भाषा</label><select class="form-select"><option>नेपाली</option><option>English</option></select></div>
          <div class="form-group"><label class="form-label">मिति ढाँचा</label><select class="form-select"><option>नेपाली (YYYY-MM-DD)</option><option>अंग्रेजी (DD/MM/YYYY)</option></select></div>
          <div class="form-group"><div class="d-flex align-center justify-between"><label class="form-label mb-0">सूचना</label><input type="checkbox" checked /></div></div>
          <div class="form-group"><div class="d-flex align-center justify-between"><label class="form-label mb-0">ईमेल अपडेट</label><input type="checkbox" checked /></div></div>
          <button class="btn btn-primary">सेटिङहरू सुरक्षित गर्नुहोस्</button>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('contentArea').innerHTML = content;
  updateActiveNavItem();
}

// Apply a UI theme and persist choice
function applyTheme(theme) {
  try {
    currentTheme = theme || 'light';
    localStorage.setItem('nvc_theme', currentTheme);
    if (currentTheme === 'dark') document.documentElement.classList.add('dark-mode');
    else document.documentElement.classList.remove('dark-mode');
    showToast('प्रदर्शन मोड परिवर्तन गरियो: ' + currentTheme, 'success');
  } catch (e) {
    console.warn('applyTheme error', e);
  }
}

// Load saved theme (safe no-op if localStorage not available)
function loadTheme() {
  try {
    const saved = localStorage.getItem('nvc_theme');
    if (saved) currentTheme = saved;
    if (currentTheme === 'dark') document.documentElement.classList.add('dark-mode');
    else document.documentElement.classList.remove('dark-mode');
    return currentTheme;
  } catch (e) {
    currentTheme = 'light';
    return currentTheme;
  }
}

function showCalendarView() {
  state.currentView = 'calendar';
  document.getElementById('pageTitle').textContent = 'क्यालेन्डर';
  const today = new Date();

  // Convert today's AD to BS YYYY-MM-DD using central converter
  const adDateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  let bsDateStr = '';
  try { bsDateStr = convertADtoBS(adDateStr) || ''; } catch(e){ bsDateStr = ''; }

  // Fallback: if conversion returns empty, try getCurrentNepaliDate which may use libs
  if (!bsDateStr) bsDateStr = getCurrentNepaliDate() || '';

  const nepaliMonths = ["बैशाख","जेठ","असार","साउन","भदौ","असोज","कार्तिक","मंसिर","पुष","माघ","फागुन","चैत"];
  const weekdays = ["आइत","सोम","मंगल","बुध","बिही","शुक्र","शनि"];

  // parse BS parts
  let bsYear = null, bsMonth = null, bsDay = null;
  if (bsDateStr && bsDateStr.indexOf('-') !== -1) {
    const parts = bsDateStr.split('-').map(p => parseInt(p,10));
    bsYear = parts[0]; bsMonth = parts[1]; bsDay = parts[2];
  }

  // approximate month length array (BS)
  const bsMonthDays = [30,31,32,31,32,30,30,29,30,29,30,30];
  const totalDays = (bsMonth && bsMonthDays[bsMonth-1]) ? bsMonthDays[bsMonth-1] : 30;

  // find the weekday of BS yyyy-mm-01 by searching nearby AD dates (robust without BS2AD)
  let firstWeekday = 0;
  try {
    // search within +/- 60 days from today
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let found = false;
    for (let offset = -80; offset <= 80; offset++) {
      const dt = new Date(base);
      dt.setDate(base.getDate() + offset);
      const ad = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
      const conv = convertADtoBS(ad);
      if (conv) {
        const cp = conv.split('-').map(x => parseInt(x,10));
        if (cp[0] === bsYear && cp[1] === bsMonth && cp[2] === 1) { firstWeekday = dt.getDay(); found = true; break; }
      }
    }
  } catch(e) { console.warn('Failed to compute BS first weekday', e); }

  // build calendar HTML
  let calendarHTML = '';
  for (let i = 0; i < 7; i++) calendarHTML += `<div class="text-center p-2 bg-gray-100 rounded"><div class="text-small font-weight-bold">${weekdays[i]}</div></div>`;
  for (let i = 0; i < firstWeekday; i++) calendarHTML += '<div class="p-2 border rounded"></div>';
  for (let day = 1; day <= totalDays; day++) {
    const isToday = (bsDay && day === bsDay);
    const hasComplaint = day % 5 === 0 || day % 7 === 0;
    calendarHTML += `<div class="p-2 border rounded text-center ${isToday ? 'bg-primary text-white' : ''} ${hasComplaint ? 'bg-primary-light' : ''}"><div class="text-small">${_latinToDevnagari(day)}</div>${hasComplaint ? '<div class="text-xs text-primary"></div>' : ''}</div>`;
  }

  const headerTitle = (bsYear && bsMonth) ? `${nepaliMonths[bsMonth-1]} ${bsYear}` : (bsDateStr || '');

  const content = `
    <div class="card mb-3">
      <div class="card-header d-flex justify-between align-center">
        <h5 class="mb-0">${headerTitle}</h5>
        <div class="d-flex gap-2"><button class="btn btn-sm btn-outline" onclick="showCalendarPrev()"><i class="fas fa-chevron-left"></i></button><button class="btn btn-sm btn-outline" onclick="showCalendarNext()"><i class="fas fa-chevron-right"></i></button></div>
      </div>
      <div class="card-body">
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">${calendarHTML}</div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-header"><h5 class="mb-0">आगामी बैठकहरू र कार्यक्रमहरू</h5></div>
      <div class="card-body">
        <div class="d-grid gap-2">
          <div class="d-flex align-center justify-between p-2 border rounded"><div><div class="text-small font-weight-bold">उजुरी व्यवस्थापन समिति बैठक</div><div class="text-xs text-muted"></div></div><button class="btn btn-sm btn-outline">विवरण</button></div>
          <div class="d-flex align-center justify-between p-2 border rounded"><div><div class="text-small font-weight-bold">मासिक समीक्षा बैठक</div><div class="text-xs text-muted"></div></div><button class="btn btn-sm btn-outline">विवरण</button></div>
          <div class="d-flex align-center justify-between p-2 border rounded"><div><div class="text-small font-weight-bold">उजुरी फछ्रयौट समय सीमा</div><div class="text-xs text-muted"></div></div><button class="btn btn-sm btn-outline">विवरण</button></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('contentArea').innerHTML = content;
  updateActiveNavItem();
}

// place-holder handlers for prev/next (can be enhanced to change month view)
function showCalendarPrev() { /* TODO: implement month navigation */ updateNepaliDate(); showCalendarView(); }
function showCalendarNext() { /* TODO: implement month navigation */ updateNepaliDate(); showCalendarView(); }

function viewComplaint(id) {
  console.log('👁️ viewComplaint() called with ID:', id, 'Type:', typeof id);
  
  if (!state.complaints || state.complaints.length === 0) {
    alert('उजुरी फेला परेन - कुनै उजुरी छैन');
    return;
  }
  
  // ID लाई स्ट्रिङमा परिवर्तन गर्ने (सुरक्षित तुलनाको लागि)
  const searchId = String(id).trim();
  
  // खोज्ने - विभिन्न तरिकाले
  let complaint = null;
  
  // 1. Number को रूपमा खोज्ने (किनकि ID 1,2,3 जस्तो छ)
  const numId = parseInt(searchId);
  if (!isNaN(numId)) {
    complaint = state.complaints.find(c => 
      parseInt(c.id) === numId || 
      parseInt(c['उजुरी दर्ता नं']) === numId ||
      parseInt(c.complaintId) === numId
    );
  }
  
  // 2. String को रूपमा खोज्ने (case insensitive)
  if (!complaint) {
    complaint = state.complaints.find(c => {
      const cId = String(c.id || c['उजुरी दर्ता नं'] || c.complaintId || '');
      return cId.toLowerCase() === searchId.toLowerCase();
    });
  }
  
  // 3. Direct equality
  if (!complaint) {
    complaint = state.complaints.find(c => 
      c.id == id || 
      c['उजुरी दर्ता नं'] == id || 
      c.complaintId == id
    );
  }
  
  if (!complaint) {
    console.error('❌ Complaint not found. Available IDs:', 
      state.complaints.map(c => ({ 
        id: c.id, 
        'उजुरी दर्ता नं': c['उजुरी दर्ता नं'],
        complainant: c.complainant 
      }))
    );
    alert(`उजुरी फेला परेन (ID: ${id})`);
    return;
  }
  
  console.log('✅ Complaint found:', complaint);
  
  // अब modal मा देखाउने
  const status = complaint.status || complaint['स्थिति'] || 'pending';
  const statusText = status === 'resolved' ? 'फछ्रयौट' :
                    status === 'pending' ? 'काम बाँकी' : 'चालु';
  
  const statusClass = status === 'resolved' ? 'status-resolved' :
                     status === 'pending' ? 'status-pending' : 'status-progress';
  
  // AI Analysis
  const aiAnalysis = AI_SYSTEM.analyzeComplaint(complaint.description || complaint['उजुरीको संक्षिप्त विवरण'] || '');

  const content = `
    <div class="d-grid gap-3">
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div>
          <div class="text-small text-muted">दर्ता नं</div>
          <div class="text-large font-weight-bold">${complaint.id || complaint['उजुरी दर्ता नं'] || '-'}</div>
        </div>
        <div>
          <div class="text-small text-muted">दर्ता मिति</div>
          <div class="text-large">${complaint.date || complaint['दर्ता मिति'] || '-'}</div>
        </div>
        <div>
          <div class="text-small text-muted">स्थिति</div>
          <div><span class="status-badge ${statusClass}">${statusText}</span></div>
        </div>
      </div>
      
      <div class="ai-analysis-box">
        <div class="mb-2"><span class="ai-badge"><i class="fas fa-robot"></i> AI विश्लेषण</span></div>
        <div class="text-small"><strong>सारांश:</strong> ${aiAnalysis.summary}</div>
        <div class="d-flex gap-3 mt-2 text-small"><span><strong>प्राथमिकता:</strong> ${aiAnalysis.priority}</span><span><strong>श्रेणी:</strong> ${aiAnalysis.category}</span></div>
        <div class="text-small mt-1"><strong>वर्गीकरण:</strong> ${aiAnalysis.classification}</div>
      </div>

      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div>
          <div class="text-small text-muted">उजुरकर्ता</div>
          <div>${complaint.complainant || complaint['उजुरीकर्ताको नाम'] || '-'}</div>
        </div>
        <div>
          <div class="text-small text-muted">विपक्षी</div>
          <div>${complaint.accused || complaint['विपक्षी'] || '-'}</div>
        </div>
      </div>
      
      <div>
        <div class="text-small text-muted">उजुरीको विवरण</div>
        <div class="card p-3 bg-light">${complaint.description || complaint['उजुरीको संक्षिप्त विवरण'] || 'कुनै विवरण छैन'}</div>
      </div>
      
      <div>
        <div class="text-small text-muted">समितिको निर्णय</div>
        <div class="card p-3 bg-light">${complaint.committeeDecision || 'कुनै निर्णय छैन'}</div>
      </div>
      
      ${complaint.decision ? `
        <div>
          <div class="text-small text-muted">अन्तिम निर्णय (विवरण)</div>
          <div class="card p-3 bg-light">${complaint.decision}</div>
        </div>
      ` : ''}
      
      ${complaint.finalDecision ? `
        <div>
          <div class="text-small text-muted">अन्तिम निर्णयको प्रकार</div>
          <div class="card p-3 bg-light">${FINAL_DECISION_TYPES[complaint.finalDecision] || complaint.finalDecision}</div>
        </div>
      ` : ''}

      <div>
        <div class="text-small text-muted">कैफियत</div>
        <div class="card p-3 bg-light">${complaint.remarks || complaint['कैफियत'] || '-'}</div>
      </div>
      
      ${state.currentUser.role === 'admin' || state.currentUser.role === 'mahashakha' ? `
      <div class="mt-3 border-top pt-3">
        <button class="btn btn-warning btn-sm w-100" onclick="openPushNotificationModal('${complaint.id}')"><i class="fas fa-bell"></i> शाखालाई नोटिफिकेसन पठाउनुहोस्</button>
      </div>` : ''}
    </div>
  `;
  
  openModal('उजुरी विवरण', content);
}

function openPushNotificationModal(complaintId) {
  const complaint = state.complaints.find(c => c.id === complaintId);
  const targetShakha = complaint ? (complaint.shakha || '') : '';
  
  const content = `
    <div class="form-group">
      <label class="form-label">उजुरी नं: ${complaintId}</label>
    </div>
    <div class="form-group">
      <label class="form-label">सन्देश *</label>
      <textarea class="form-control" id="pushMessage" rows="3" placeholder="शाखालाई पठाउने सन्देश लेख्नुहोस्..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">प्रकार</label>
      <select class="form-select" id="pushType">
        <option value="info">जानकारी (Info)</option>
        <option value="warning">चेतावनी (Warning)</option>
        <option value="success">सफल (Success)</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">लक्षित शाखा</label>
      <select class="form-select" id="pushTarget">
        <option value="${targetShakha}" selected>${targetShakha || 'छान्नुहोस्'}</option>
        ${Object.entries(SHAKHA).map(([k, v]) => `<option value="${v}">${v}</option>`).join('')}
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">रद्द गर्नुहोस्</button>
      <button class="btn btn-primary" onclick="sendPushNotification('${complaintId}')">पठाउनुहोस्</button>
    </div>
  `;
  openModal('नोटिफिकेसन पठाउनुहोस्', content);
}

async function sendPushNotification(complaintId) {
  const message = document.getElementById('pushMessage').value;
  const target = document.getElementById('pushTarget').value;
  const type = document.getElementById('pushType').value || 'info';
  
  if(!message) { showToast('कृपया सन्देश लेख्नुहोस्', 'warning'); return; }
  
  showLoadingIndicator(true);

  const notification = {
    id: Date.now().toString(),
    title: `उजुरी नं ${complaintId} सम्बन्धमा`,
    time: new Date().toLocaleString('ne-NP'),
    read: false,
    targetShakha: target,
    message: message,
    type: type,
    sender: state.currentUser.name,
    createdAt: new Date().toISOString()
  };
  
  // Save to local storage (Optimistic)
  const pushed = JSON.parse(localStorage.getItem('nvc_pushed_notifications') || '[]');
  pushed.unshift(notification);
  localStorage.setItem('nvc_pushed_notifications', JSON.stringify(pushed));
  
  // Send to Google Sheets
  if (GOOGLE_SHEETS_CONFIG.ENABLED) {
      await postToGoogleSheets('sendNotification', notification);
  }

  showLoadingIndicator(false);
  showToast('नोटिफिकेसन पठाइयो', 'success');
  closeModal();
}

function editComplaint(id) {
  let complaint = state.complaints.find(c => c.id == id);
  if (!complaint) {
    complaint = state.complaints.find(c => String(c.id).trim() === String(id).trim());
  }
  if (!complaint) return;
  
  const formContent = `
    <div class="d-grid gap-3" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
      <div class="form-group"><label class="form-label">दर्ता नं</label><input type="text" class="form-control" value="${complaint.id}" readonly /></div>
      <div class="form-group">
        <label class="form-label">दर्ता मिति</label>
        <div class="input-group">
          <input type="hidden" id="editDate" value="${complaint.date || ''}" />
          <div class="d-flex gap-2 nepali-datepicker-dropdown" data-target="editDate">
            <select id="editDate_year" class="form-select bs-year"><option value="">साल</option></select>
            <select id="editDate_month" class="form-select bs-month"><option value="">महिना</option></select>
            <select id="editDate_day" class="form-select bs-day"><option value="">गते</option></select>
          </div>
        </div>
      </div>
      <div class="form-group"><label class="form-label">उजुरकर्ताको नाम</label><input type="text" class="form-control" value="${complaint.complainant}" id="editComplainant" /></div>
      <div class="form-group"><label class="form-label">विपक्षी</label><input type="text" class="form-control" value="${complaint.accused || ''}" id="editAccused" /></div>
      <div class="form-group" style="grid-column: span 2;"><label class="form-label">उजुरीको विवरण</label><textarea class="form-control" rows="3" id="editDescription">${complaint.description}</textarea></div>
      
      <div class="form-group" style="grid-column: span 2;"><label class="form-label">समितिको निर्णय</label><textarea class="form-control" rows="2" id="editCommitteeDecision">${complaint.committeeDecision || complaint.proposedDecision || ''}</textarea></div>
      <div class="form-group" style="grid-column: span 2;"><label class="form-label">अन्तिम निर्णय (विवरण)</label><textarea class="form-control" rows="2" id="editDecision">${complaint.decision || ''}</textarea></div>

      <div class="form-group"><label class="form-label">कैफियत</label><input type="text" class="form-control" value="${complaint.remarks || ''}" id="editRemarks" /></div>
      <div class="form-group"><label class="form-label">स्थिति</label><select class="form-select" id="editStatus"><option value="pending" ${complaint.status === 'pending' ? 'selected' : ''}>काम बाँकी</option><option value="progress" ${complaint.status === 'progress' ? 'selected' : ''}>चालु</option><option value="resolved" ${complaint.status === 'resolved' ? 'selected' : ''}>फछ्रयौट</option></select></div>
      
      <div class="form-group"><label class="form-label">अन्तिम निर्णयको प्रकार</label><select class="form-select" id="editFinalDecision"><option value="">छान्नुहोस्</option>${Object.entries(FINAL_DECISION_TYPES).map(([key, value]) => `<option value="${key}" ${String(complaint.finalDecision) === String(key) || complaint.finalDecision === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div>

    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">रद्द गर्नुहोस्</button><button class="btn btn-primary" onclick="saveEditedComplaint('${id}')">सुरक्षित गर्नुहोस्</button></div>
  `;
  
  openModal('उजुरी सम्पादन', formContent);
  setTimeout(()=>{ initializeDatepickers(); initializeNepaliDropdowns(); }, 100);
}

function saveComplaint(id) {
  const complaintIndex = state.complaints.findIndex(c => c.id === id);
  if (complaintIndex === -1) return;
  
  const updatedComplaint = {
    ...state.complaints[complaintIndex],
    date: document.getElementById('editDate').value,
    complainant: document.getElementById('editComplainant').value,
    accused: document.getElementById('editAccused').value,
    description: document.getElementById('editDescription').value,
    remarks: document.getElementById('editRemarks').value,
    status: document.getElementById('editStatus').value,
    committeeDecision: document.getElementById('editCommitteeDecision')?.value || state.complaints[complaintIndex].committeeDecision,
    decision: document.getElementById('editDecision')?.value || state.complaints[complaintIndex].decision,
    finalDecision: document.getElementById('editFinalDecision')?.value || state.complaints[complaintIndex].finalDecision,
    updatedAt: new Date().toISOString(),
    updatedBy: state.currentUser.name
  };
  
  state.complaints[complaintIndex] = updatedComplaint;
  showToast('उजुरी सुरक्षित गरियो', 'success');
  closeModal();
  showComplaintsView();
}

function deleteComplaint(id) {
  if (confirm('के तपाईं यो उजुरी हटाउन चाहनुहुन्छ?')) {
    const index = state.complaints.findIndex(c => c.id === id);
    if (index !== -1) {
      state.complaints.splice(index, 1);
      backupToLocalStorage();
      showToast('उजुरी हटाइयो', 'success');
      showComplaintsView();
    }
  }
}

function filterComplaintsTable() {
  // Use unified rendering via showComplaintsView to respect pagination and sorting.
  const status = document.getElementById('filterStatus')?.value || '';
  const priority = document.getElementById('filterPriority')?.value || '';
  const shakha = document.getElementById('filterShakha')?.value || '';
  const searchField = document.getElementById('searchField')?.value || 'all';
  const searchText = (document.getElementById('searchText')?.value || '').toLowerCase();
  const sortOrder = document.getElementById('sortOrder')?.value || 'newest';
  const startDate = document.getElementById('filterStartDate')?.value || '';
  const endDate = document.getElementById('filterEndDate')?.value || '';

  if (!state.pagination) state.pagination = { itemsPerPage: 10, currentPage: 1, totalItems: 0 };
  state.pagination.currentPage = 1;
  
  showComplaintsView({ 
      status, 
      priority, 
      shakha, 
      searchField, 
      search: searchText, 
      sortOrder, 
      startDate, 
      endDate,
      _fromFilter: true
  });
}

function saveComplaintsFilters() {
    const filters = {
        status: document.getElementById('filterStatus')?.value || '',
        priority: document.getElementById('filterPriority')?.value || '',
        shakha: document.getElementById('filterShakha')?.value || '',
        searchField: document.getElementById('searchField')?.value || 'all',
        search: document.getElementById('searchText')?.value || '',
        sortOrder: document.getElementById('sortOrder')?.value || 'newest',
        startDate: document.getElementById('filterStartDate')?.value || '',
        endDate: document.getElementById('filterEndDate')?.value || ''
    };
    
    localStorage.setItem('nvc_complaints_filters', JSON.stringify(filters));
    showToast('फिल्टरहरू सुरक्षित गरियो', 'success');
}

function clearComplaintsFilters() {
    localStorage.removeItem('nvc_complaints_filters');
    showComplaintsView({}); // Reload with defaults
    showToast('फिल्टरहरू रिसेट गरियो', 'info');
}

// Delegated handler for complaints table actions (works for dynamically rendered buttons)
function handleTableActions(e) {
  const targetBtn = e.target.closest('button');
  if (!targetBtn) return;

  // find the table row
  const row = targetBtn.closest('tr');
  const complaintId = targetBtn.getAttribute('data-id') || row?.getAttribute('data-id');

  // Prefer explicit data-action attribute
  const action = (targetBtn.getAttribute('data-action') || '').toLowerCase();

  if (action) {
    e.preventDefault();
    e.stopPropagation(); // Stop event bubbling
    if (action === 'view') return viewComplaint(complaintId);
    if (action === 'edit') return editComplaint(complaintId);
    if (action === 'delete') return deleteComplaint(complaintId);
    if (action === 'assign') return assignComplaint && assignComplaint(complaintId);
    return;
  }

  // Fallback: inspect icon classes
  const icon = targetBtn.querySelector('i') || targetBtn;
  if (icon.classList.contains('fa-eye')) viewComplaint(complaintId);
  else if (icon.classList.contains('fa-edit')) editComplaint(complaintId);
  else if (icon.classList.contains('fa-trash')) deleteComplaint(complaintId);
  e.preventDefault();
}

function toggleFilterBar() {
    const content = document.getElementById('filterContent');
    if (content) {
        content.classList.toggle('d-none');
    }
}

function filterAdminComplaints() {
  const status = document.getElementById('filterStatus').value;
  const searchText = document.getElementById('searchText').value.toLowerCase();
  
  let filtered = state.complaints.filter(c => c.source === 'hello_sarkar');
  
  if (status) filtered = filtered.filter(c => c.status === status);
  if (searchText) {
    filtered = filtered.filter(c => 
      c.id.toLowerCase().includes(searchText) ||
      c.complainant.toLowerCase().includes(searchText) ||
      c.accused.toLowerCase().includes(searchText) ||
      c.description.toLowerCase().includes(searchText)
    );
  }
  
  const tbody = document.getElementById('adminComplaintsTable');
  if (tbody) {
    tbody.innerHTML = filtered.map((complaint, index) => `
      <tr>
        <td data-label="क्र.सं.">${index + 1}</td><td data-label="मिति">${complaint.date}</td><td data-label="उजुरकर्ता">${complaint.complainant}</td><td data-label="विपक्षी">${complaint.accused || '-'}</td>
        <td data-label="उजुरीको विवरण" class="text-limit" title="${complaint.description}">${complaint.description.substring(0, 50)}...</td>
        <td data-label="सम्बन्धित शाखा">${complaint.assignedShakha || '-'}</td><td data-label="शाखामा पठाएको मिति">${complaint.assignedDate || '-'}</td>
        <td data-label="निर्णय" class="text-limit" title="${complaint.decision || ''}">${complaint.decision ? complaint.decision.substring(0, 30) + '...' : '-'}</td>
        <td data-label="कैफियत">${complaint.remarks || '-'}</td>
        <td data-label="कार्य"><div class="table-actions"><button class="action-btn" data-action="view" data-id="${complaint.id}" title="हेर्नुहोस्"><i class="fas fa-eye"></i></button><button class="action-btn" data-action="assign" data-id="${complaint.id}" title="शाखामा पठाउनुहोस्"><i class="fas fa-paper-plane"></i></button></div></td>
      </tr>
    `).join('');
  }
}

function filterProjects() {
  const status = document.getElementById('filterProjectStatus').value;
  const searchText = document.getElementById('projectSearchText').value.toLowerCase();
  
  let filtered = state.projects.filter(p => p.shakha === state.currentUser.shakha);
  
  if (status) filtered = filtered.filter(p => p.status === status);
  if (searchText) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchText) ||
      p.organization.toLowerCase().includes(searchText) ||
      p.nonCompliances.toLowerCase().includes(searchText)
    );
  }
  
  const tbody = document.getElementById('projectsTable');
  if (tbody) {
    tbody.innerHTML = filtered.map((project, index) => `
      <tr>
        <td data-label="क्र.सं.">${index + 1}</td><td data-label="आयोजनाको नाम">${project.name}</td><td data-label="सम्बन्धित निकाय">${project.organization}</td><td data-label="अनुगमन/प्राविधिक परीक्षण मिति">${project.inspectionDate}</td>
        <td data-label="अपरिपालनाहरु (NCR)" class="text-limit" title="${project.nonCompliances}">${project.nonCompliances.substring(0, 50)}...</td>
        <td data-label="सुधारका लागि पत्रको मिति">${project.improvementLetterDate || '-'}</td><td data-label="सुधारको जानकारी प्राप्त मिति">${project.improvementInfo || '-'}</td><td data-label="कैफियत">${project.remarks || '-'}</td>
        <td data-label="कार्य"><div class="table-actions"><button class="action-btn" onclick="viewProject('${project.id}')" title="हेर्नुहोस्"><i class="fas fa-eye"></i></button><button class="action-btn" onclick="editProject('${project.id}')" title="सम्पादन गर्नुहोस्"><i class="fas fa-edit"></i></button></div></td>
      </tr>
    `).join('');
  }
}

function updatePagination() {
  const paginationElement = document.querySelector('.pagination');
  if (paginationElement) {
    const totalPages = Math.ceil(state.pagination.totalItems / state.pagination.itemsPerPage);
    paginationElement.style.display = totalPages <= 1 ? 'none' : 'flex';
  }
}

function updateActiveNavItem() {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    let viewToHighlight = state.currentView;

    // Rule: If the user is an admin and the view is the generic 'complaints'
    // (likely from a dashboard widget click), we should highlight the 'all_complaints' menu item.
    if (state.currentUser?.role === 'admin' && state.currentView === 'complaints') {
        viewToHighlight = 'all_complaints';
    }

    const navTextMap = {
        'dashboard': 'ड्यासबोर्ड',
        'all_complaints': 'सबै उजुरीहरू',
        'shakha_reports': 'शाखा रिपोर्टहरू',
        'user_management': 'प्रयोगकर्ता व्यवस्थापन',
        'system_reports': 'रिपोर्टहरू',
        'settings': 'सेटिङहरू',
        'complaints': 'उजुरीहरू', // For non-admin roles
        'new_complaint': 'नयाँ उजुरी',
        'technical_projects': 'प्राविधिक परीक्षण/आयोजना अनुगमन',
        'admin_complaints': 'हेलो सरकार उजुरीहरू',
        'employee_monitoring': 'कार्यालय अनुगमन',
        'citizen_charter': 'नागरिक बडापत्र अनुगमन',
        'calendar': 'क्यालेन्डर'
    };

    const targetText = navTextMap[viewToHighlight];

    if (targetText) {
        let itemFound = false;
        // First, try to find an exact match inside the specific span
        document.querySelectorAll('.nav-item .nav-text').forEach(span => {
            if (span.textContent.trim() === targetText) {
                span.closest('.nav-item').classList.add('active');
                itemFound = true;
            }
        });
    } else {
        // If no view is matched, default to highlighting the first nav item (usually Dashboard)
        const firstNavItem = document.querySelector('#sidebarNav .nav-item');
        if (firstNavItem) {
            firstNavItem.classList.add('active');
        }
    }
}

function viewShakhaDetails(shakha) {
  const shakhaComplaints = state.complaints.filter(c => c.shakha === shakha);
  const pending = shakhaComplaints.filter(c => c.status === 'pending').length;
  const resolved = shakhaComplaints.filter(c => c.status === 'resolved').length;
  const progress = shakhaComplaints.filter(c => c.status === 'progress').length;
  const resolutionRate = shakhaComplaints.length > 0 ? Math.round((resolved / shakhaComplaints.length) * 100) : 0;
  
  const content = `
    <div class="d-grid gap-3">
      <div><h5 class="text-center mb-3">${shakha} को विवरण</h5></div>
      <div class="d-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
        <div class="text-center p-3 border rounded"><div class="text-large">${shakhaComplaints.length}</div><div class="text-small text-muted">कूल उजुरी</div></div>
        <div class="text-center p-3 border rounded"><div class="text-large text-warning">${pending}</div><div class="text-small text-muted">काम बाँकी</div></div>
        <div class="text-center p-3 border rounded"><div class="text-large text-info">${progress}</div><div class="text-small text-muted">चालु</div></div>
        <div class="text-center p-3 border rounded"><div class="text-large text-success">${resolved}</div><div class="text-small text-muted">फछ्रयौट</div></div>
        <div class="text-center p-3 border rounded"><div class="text-large">${resolutionRate}%</div><div class="text-small text-muted">फछ्रयौट दर</div></div>
      </div>
      <div><h6 class="mb-2">हालैका उजुरीहरू</h6><div class="table-responsive" style="max-height: 300px;"><table class="table table-compact"><thead><tr><th>दर्ता नं</th><th>मिति</th><th>उजुरकर्ता</th><th>स्थिति</th></tr></thead><tbody>
        ${shakhaComplaints.slice(0, 10).map(complaint => `<tr><td data-label="दर्ता नं">${complaint.id}</td><td data-label="मिति">${complaint.date}</td><td data-label="उजुरकर्ता">${complaint.complainant}</td><td data-label="स्थिति"><span class="status-badge ${complaint.status === 'resolved' ? 'status-resolved' : complaint.status === 'pending' ? 'status-pending' : 'status-progress'}">${complaint.status === 'resolved' ? 'फछ्रयौट' : complaint.status === 'pending' ? 'काम बाँकी' : 'चालु'}</span></td></tr>`).join('')}
      </tbody></table></div></div>
    </div>
    <div class="modal-footer"><button class="btn btn-primary" onclick="exportShakhaDetails('${shakha}')">Excel एक्पोर्ट गर्नुहोस्</button></div>
  `;
  
  openModal(`${shakha} को विस्तृत विवरण`, content);
}

function generateMonthlyReport() {
  const currentDate = new Date();
  const monthNames = ["जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन", 
                     "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"];
  const monthName = monthNames[currentDate.getMonth()];
  const year = currentDate.getFullYear();
  const reportName = `${year} ${monthName} महिनाको रिपोर्ट`;
  
  const monthlyComplaints = state.complaints.filter(c => {
    const complaintDate = new Date(c.date);
    return complaintDate.getMonth() === currentDate.getMonth() && 
           complaintDate.getFullYear() === currentDate.getFullYear();
  });
  
  if (monthlyComplaints.length === 0) {
    showToast('यस महिना कुनै उजुरी छैन', 'info');
    return;
  }
  
  generateReport(reportName, monthlyComplaints);
}

function generateShakhaReport() {
  if (state.currentUser.role !== 'admin') {
    const shakhaComplaints = state.complaints.filter(c => c.shakha === SHAKHA[state.currentUser.shakha] || c.shakha === state.currentUser.shakha);
    const reportName = `${state.currentUser.shakha} को रिपोर्ट`;
    generateReport(reportName, shakhaComplaints);
  } else {
    showToast('कृपया शाखा रिपोर्टहरू पृष्ठबाट रिपोर्ट जेनरेट गर्नुहोस्', 'info');
  }
}

function generateSummaryReport() {
  const total = state.complaints.length;
  const pending = state.complaints.filter(c => c.status === 'pending').length;
  const resolved = state.complaints.filter(c => c.status === 'resolved').length;
  const progress = state.complaints.filter(c => c.status === 'progress').length;
  
  const summaryData = [{
    'कूल उजुरी': total, 'काम बाँकी': pending, 'चालु': progress,
    'फछ्रयौट': resolved, 'फछ्रयौट दर': total > 0 ? Math.round((resolved / total) * 100) + '%' : '0%',
    'औसत प्रतिक्रिया समय': ' दिन', 'सक्रिय शाखाहरू': '', 'महिनाको वृद्धि': '%'
  }];
  
  generateReport('समग्र सारांश रिपोर्ट', summaryData);
}

// ==================== CHATBOT FUNCTIONS ====================
function toggleChatbot() {
    const chatbotWindow = document.getElementById('chatbotWindow');
    chatbotWindow.classList.toggle('show');
    if (chatbotWindow.classList.contains('show')) {
        document.getElementById('chatInput').focus();
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    const chatBody = document.getElementById('chatBody');
    
    // User Message
    chatBody.innerHTML += `<div class="chat-message chat-user-msg">${message}</div>`;
    input.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;

    // Bot Response (Simulated Delay)
    setTimeout(() => {
        const response = AI_SYSTEM.getChatResponse(message);
        chatBody.innerHTML += `<div class="chat-message chat-bot-msg">${response}</div>`;
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 600);
}

function generateReport(reportName, data) {
  const headers = Object.keys(data[0]);
  let csvContent = headers.join(',') + '\n';
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
    });
    csvContent += values.join(',') + '\n';
  });
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  const filename = `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`;
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast(`रिपोर्ट डाउनलोड हुँदैछ: ${reportName}`, 'success');
}

function generatePerformanceReport() { showToast('प्रदर्शन रिपोर्ट तयार हुँदैछ...', 'info'); }
function generateResolutionReport() { showToast('फछ्रयौट रिपोर्ट तयार हुँदैछ...', 'info'); }
function generateTimelinessReport() { showToast('समयानुसार रिपोर्ट तयार हुँदैछ...', 'info'); }
function generateUserActivityReport() { showToast('प्रयोगकर्ता गतिविधि रिपोर्ट तयार हुँदैछ...', 'info'); }
function exportSystemReport() { showToast('प्रणाली रिपोर्ट डाउनलोड हुँदैछ...', 'info'); }

function openAdminLogin() {
  document.getElementById('loginPageTitle').textContent = 'एडमिन लग-इन';
  document.getElementById('loginPageSubtitle').textContent = 'युजरनेम र पासवर्ड प्रविष्ट गर्नुहोस्';
  showPage('loginPage');
}

function openReports() {
  showPage('loginPage');
  document.getElementById('loginPageTitle').textContent = 'रिपोर्ट एक्सेस';
  document.getElementById('loginPageSubtitle').textContent = 'रिपोर्ट हेर्न लग-इन गर्नुहोस्';
}

function openSettings() {
  showPage('loginPage');
  document.getElementById('loginPageTitle').textContent = 'सेटिङ एक्सेस';
  document.getElementById('loginPageSubtitle').textContent = 'सेटिङहरू परिवर्तन गर्न लग-इन गर्नुहोस्';
}

async function initializeApp() {
  if (window._appInitialized) {
    console.log('⚠️ App already initialized');
    return;
  }
  
  console.log('%c🚀 ===== NVC APP INITIALIZING =====', 'color: blue; font-size: 16px; font-weight: bold');
  window._appInitializing = true;
  showLoadingIndicator(true);
  
  // Initialize state arrays
  if (!state.complaints) state.complaints = [];
  if (!state.projects) state.projects = [];
  if (!state.employeeMonitoring) state.employeeMonitoring = [];
  if (!state.citizenCharters) state.citizenCharters = [];
  if (!state.pagination) state.pagination = { currentPage: 1, itemsPerPage: 10 };

  // Populate dummy users if empty
  if (!state.users || state.users.length === 0) {
    state.users = [
      { id: 1, username: 'admin', name: 'एडमिन', role: 'admin', status: 'सक्रिय', lastLogin: new Date().toISOString().slice(0,10) },
      { id: 2, username: 'admin_plan', name: 'प्रशासन तथा योजना शाखा', role: 'shakha', shakha: 'ADMIN_PLANNING', status: 'सक्रिय', lastLogin: '-' },
      { id: 3, username: 'info_collect', name: 'सूचना संकलन शाखा', role: 'shakha', shakha: 'INFO_COLLECTION', status: 'सक्रिय', lastLogin: '-' },
      { id: 4, username: 'complaint_mgmt', name: 'उजुरी व्यवस्थापन शाखा', role: 'shakha', shakha: 'COMPLAINT_MANAGEMENT', status: 'सक्रिय', lastLogin: '-' }
    ];
  }
  
  // Load from localStorage immediately and SANITIZE
  try {
    const savedComplaints = localStorage.getItem('nvc_complaints_backup');
    if (savedComplaints) {
      const parsedComplaints = JSON.parse(savedComplaints);
      if (Array.isArray(parsedComplaints)) {
        state.complaints = parsedComplaints.map(c => {
          if (!c) return null;
          return {
            ...c,
            description: String(c.description || ''),
            id: String(c.id || ''),
            complainant: String(c.complainant || ''),
            accused: String(c.accused || ''),
            remarks: String(c.remarks || ''),
            decision: String(c.decision || ''),
            committeeDecision: String(c.committeeDecision || ''),
            shakha: String(c.shakha || ''),
            status: String(c.status || 'pending')
          };
        }).filter(Boolean);
        console.log(`✅ Loaded and formatted ${state.complaints.length} complaints from localStorage`);
      }
    }
    // Load other data from localStorage...
  } catch (e) {
    console.warn('⚠️ Error loading from localStorage:', e);
  }
  
  // Check session
  const savedSession = localStorage.getItem('nvc_session');
  if (savedSession) {
    try {
      const session = JSON.parse(savedSession);
      if (session.expires > Date.now()) {
        state.currentUser = session.user;
        console.log('✅ Session restored for:', state.currentUser.name);
      } else {
        localStorage.removeItem('nvc_session');
      }
    } catch (e) {
      localStorage.removeItem('nvc_session');
    }
  }
  
  // Show appropriate page
  if (state.currentUser) showDashboardPage();
  else showPage('mainPage');
  
  // Initialize UI components immediately
  ensureStylesheetsLoaded();
  updateDateTime();
  updateNepaliDate();
  setInterval(updateDateTime, 60000);
  setInterval(updateNepaliDate, 60000);
  initializeDatepickers(); initializeNepaliDropdowns();
  loadTheme(); // Load saved theme

  // Load from Google Sheets in the background without blocking UI
  if (GOOGLE_SHEETS_CONFIG.ENABLED && GOOGLE_SHEETS_CONFIG.WEB_APP_URL && GOOGLE_SHEETS_CONFIG.WEB_APP_URL.includes('script.google.com')) {
    console.log('📡 Starting background load from Google Sheets...');
    loadDataFromGoogleSheets(true).then(loaded => {
      if (loaded) {
        console.log('✅ Background Google Sheets data loaded and UI updated.');
      } else {
        console.warn('⚠️ Background Google Sheets load failed. UI is using local data.');
      }
    });
  } else {
    console.log('ℹ️ Google Sheets not configured properly');
    showLoadingIndicator(false);
  }
  
  window._appInitialized = true;
  window._appInitializing = false;
  
  console.log('%c🏁 ===== NVC APP INITIALIZED =====', 'color: green; font-size: 16px; font-weight: bold');
}

window.onload = function() {
  console.log('🚀 window.onload triggered');
  
  // Hide loading indicator if visible
  if (typeof showLoadingIndicator === 'function') {
    showLoadingIndicator(false);
  }
  
  // Initialize app if not already initialized
  if (!window._appInitialized && !window._appInitializing) {
    initializeApp();
  }
};

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 DOMContentLoaded triggered');
  
  if (!window._appInitialized && !window._appInitializing) {
    setTimeout(() => {
      if (!window._appInitialized && !window._appInitializing) {
        initializeApp();
      }
    }, 100);
  }
});

function checkAppStatus() {
  console.log('📊 App Status:');
  console.log('- Initialized:', window._appInitialized);
  console.log('- Initializing:', window._appInitializing);
  console.log('- Sheets Loaded:', window._sheetsLoaded);
  console.log('- User:', state.currentUser?.name || 'Not logged in');
  console.log('- Page:', state.currentPage);
  console.log('- View:', state.currentView);
  console.log('- Complaints:', state.complaints?.length || 0);
  console.log('- Projects:', state.projects?.length || 0);
  console.log('- Employee Monitoring:', state.employeeMonitoring?.length || 0);
  console.log('- Citizen Charters:', state.citizenCharters?.length || 0);
  console.log('- Config URL:', GOOGLE_SHEETS_CONFIG.WEB_APP_URL);
  console.log('- Config Enabled:', GOOGLE_SHEETS_CONFIG.ENABLED);
  
  return {
    initialized: window._appInitialized,
    sheetsLoaded: window._sheetsLoaded,
    user: state.currentUser?.name,
    complaints: state.complaints?.length,
    url: GOOGLE_SHEETS_CONFIG.WEB_APP_URL
  };
}

// Expose commonly-used action functions on `window` so inline onclick handlers work
try {
  window.viewComplaint = viewComplaint;
  window.editComplaint = editComplaint;
  window.deleteComplaint = deleteComplaint;
  window.generateCustomReport = typeof generateCustomReport === 'function' ? generateCustomReport : undefined;
  window.saveComplaintsFilters = saveComplaintsFilters;
  window.clearComplaintsFilters = clearComplaintsFilters;
} catch (e) {
  console.warn('Could not expose global handlers on window:', e);
}

async function reinitializeApp() {
  console.log('🔄 Force reinitializing app...');
  
  window._appInitialized = false;
  window._appInitializing = false;
  window._isLoadingData = false;
  
  if (window.nvcAutoSyncInterval) {
    clearInterval(window.nvcAutoSyncInterval);
  }
  
  return await initializeApp();
}

const originalShowDashboardPage = window.showDashboardPage;
window.showDashboardPage = function() {
  if (originalShowDashboardPage) originalShowDashboardPage.apply(this, arguments);
  setTimeout(addGoogleSheetsButtons, 500);
};

// ==================== MAP & LOCATION SERVICES ====================
const DISTRICT_COORDINATES = {
    // Province 1
    'ताप्लेजुङ': [27.35, 87.6667],
    'पाँचथर': [27.1736, 87.8133],
    'इलाम': [26.9131, 87.9225],
    'झापा': [26.6219, 87.9919],
    'मोरङ': [26.6525, 87.3718],
    'सुनसरी': [26.6269, 87.1511],
    'धनकुटा': [26.9808, 87.3433],
    'तेह्रथुम': [27.1911, 87.5519],
    'संखुवासभा': [27.3714, 87.1436],
    'भोजपुर': [27.1736, 87.0458],
    'सोलुखुम्बु': [27.5, 86.5833],
    'ओखलढुंगा': [27.3167, 86.5],
    'खोटाङ': [27.2167, 86.7667],
    'उदयपुर': [26.9131, 86.6333],
    // Province 2 (Madhesh)
    'सप्तरी': [26.5333, 86.75],
    'सिराहा': [26.65, 86.2],
    'धनुषा': [26.7288, 85.9274],
    'महोत्तरी': [26.65, 85.8],
    'सर्लाही': [26.85, 85.5667],
    'रौतहट': [26.9167, 85.2667],
    'बारा': [27.0, 85.1167],
    'पर्सा': [27.0130, 84.8770],
    // Province 3 (Bagmati)
    'सिन्धुली': [27.25, 85.9667],
    'रामेछाप': [27.3333, 86.0833],
    'दोलखा': [27.65, 86.05],
    'सिन्धुपाल्चोक': [27.80, 85.70],
    'काभ्रेपलाञ्चोक': [27.60, 85.55],
    'ललितपुर': [27.6667, 85.3333],
    'भक्तपुर': [27.6710, 85.4298],
    'काठमाडौं': [27.7172, 85.3240],
    'नुवाकोट': [27.90, 85.15],
    'रसुवा': [28.1167, 85.2833],
    'धादिङ': [27.90, 84.90],
    'चितवन': [27.5291, 84.3636],
    'मकवानपुर': [27.4167, 85.0333],
    // Province 4 (Gandaki)
    'गोरखा': [28.0, 84.6333],
    'लमजुङ': [28.2333, 84.3667],
    'तनहुँ': [27.90, 84.20],
    'कास्की': [28.2096, 83.9856],
    'मनाङ': [28.6667, 84.25],
    'मुस्ताङ': [28.7833, 83.9833],
    'पर्वत': [28.2167, 83.7167],
    'स्याङ्जा': [28.00, 83.80],
    'म्याग्दी': [28.35, 83.5667],
    'बाग्लुङ': [28.2667, 83.6],
    'नवलपुर': [27.60, 84.10], // Part of former Nawalparasi
    // Province 5 (Lumbini)
    'नवलपरासी (बर्दघाट सुस्ता पश्चिम)': [27.53, 83.67], // Part of former Nawalparasi
    'रुपन्देही': [27.5017, 83.4533],
    'कपिलवस्तु': [27.55, 83.05],
    'पाल्पा': [27.85, 83.55],
    'अर्घाखाँची': [27.90, 83.10],
    'गुल्मी': [28.05, 83.25],
    'रोल्पा': [28.35, 82.60],
    'प्युठान': [28.10, 82.85],
    'दाङ': [28.00, 82.30],
    'बाँके': [28.0500, 81.6167],
    'बर्दिया': [28.20, 81.30],
    'पूर्वी रुकुम': [28.64, 82.84], // Rukum East
    // Province 6 (Karnali)
    'पश्चिम रुकुम': [28.63, 82.45], // Rukum West
    'सल्यान': [28.35, 82.15],
    'सुर्खेत': [28.6019, 81.6339],
    'दैलेख': [28.85, 81.7],
    'जाजरकोट': [28.7167, 82.1833],
    'डोल्पा': [28.9667, 82.8167],
    'हुम्ला': [29.9667, 81.8333],
    'जुम्ला': [29.2833, 82.1833],
    'कालिकोट': [29.1667, 81.5833],
    'मुगु': [29.5333, 82.15],
    // Province 7 (Sudurpashchim)
    'बाजुरा': [29.50, 81.50],
    'बझाङ': [29.55, 81.20],
    'डोटी': [29.10, 80.95],
    'अछाम': [29.10, 81.30],
    'दार्चुला': [29.85, 80.55],
    'बैतडी': [29.50, 80.45],
    'डडेल्धुरा': [29.30, 80.55],
    'कञ्चनपुर': [28.80, 80.20],
    'कैलाली': [28.6852, 80.6133]
};

function generateHotspotCards() {
    const districtCounts = {};
    (state.complaints || []).forEach(c => {
        const dist = c.district || 'अन्य';
        if (dist !== 'अन्य') {
            districtCounts[dist] = (districtCounts[dist] || 0) + 1;
        }
    });

    const sortedDistricts = Object.entries(districtCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sortedDistricts.length === 0) {
        return '<div class="text-muted text-small p-2">स्थान डाटा उपलब्ध छैन</div>';
    }

    return sortedDistricts.map(([dist, count]) => `
        <div class="hotspot-card" style="min-width: 160px;" onclick="showHotspotMap('${dist}')">
            <div class="d-flex justify-between align-center mb-1">
                <span class="font-weight-bold text-primary text-small">${dist}</span>
                <span class="badge badge-danger">${count}</span>
            </div>
            <div class="progress" style="height: 4px; background-color: #e9ecef; border-radius: 2px;">
                <div class="progress-bar" style="width: ${Math.min(100, count * 10)}%; border-radius: 2px;"></div>
            </div>
        </div>
    `).join('');
}

function showHotspotMap(focusDistrict = null) {
    state.currentView = 'hotspot_map';
    document.getElementById('pageTitle').textContent = 'हटस्पट नक्सा';
    
    const content = `
        <div class="card h-100">
            <div class="card-header d-flex justify-between align-center">
                <h5 class="mb-0">उजुरीको भौगोलिक वितरण</h5>
                <div class="d-flex gap-2">
                    <select class="form-select form-select-sm" id="mapFilterProvince" onchange="updateMapFilter()">
                        <option value="">सबै प्रदेश</option>
                        ${Object.entries(LOCATION_FIELDS.PROVINCE).map(([k, v]) => `<option value="${v}">${v}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="card-body p-0" style="position: relative;">
                <div id="hotspotMap" style="height: 600px; width: 100%; background: #f8f9fa;"></div>
            </div>
        </div>
    `;
    
    document.getElementById('contentArea').innerHTML = content;
    updateActiveNavItem();

    setTimeout(() => {
        if (typeof L === 'undefined') {
            document.getElementById('hotspotMap').innerHTML = '<div class="p-5 text-center text-danger">नक्सा लोड गर्न सकिएन (Leaflet JS missing)</div>';
            return;
        }
        if (window.nvcMap) { window.nvcMap.remove(); window.nvcMap = null; }
        const map = L.map('hotspotMap').setView([28.3949, 84.1240], 7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
        const districtCounts = {};
        (state.complaints || []).forEach(c => { const dist = c.district; if (dist) districtCounts[dist] = (districtCounts[dist] || 0) + 1; });
        Object.entries(districtCounts).forEach(([dist, count]) => {
            const coords = DISTRICT_COORDINATES[dist];
            if (coords) {
                const isHotspot = count > 5;
                const isCritical = count > 10;
                let marker;

                const clickHandler = () => {
                     const districtComplaints = (state.complaints || []).filter(c => c.district === dist);
                     let content = `<div class="table-responsive"><table class="table table-sm table-bordered"><thead><tr><th>दर्ता नं</th><th>मिति</th><th>विवरण</th><th>स्थिति</th></tr></thead><tbody>`;
                     
                     if(districtComplaints.length === 0) {
                         content += `<tr><td colspan="4" class="text-center">उजुरी छैन</td></tr>`;
                     } else {
                         districtComplaints.forEach(c => {
                             const statusText = c.status === 'resolved' ? 'फछ्रयौट' : c.status === 'progress' ? 'चालु' : 'बाँकी';
                             const statusClass = c.status === 'resolved' ? 'text-success' : c.status === 'progress' ? 'text-primary' : 'text-warning';
                             content += `<tr>
                                <td>${c.id}</td>
                                <td>${c.date}</td>
                                <td>${(c.description || '').substring(0, 40)}...</td>
                                <td class="${statusClass}">${statusText}</td>
                             </tr>`;
                         });
                     }
                     content += `</tbody></table></div>`;
                     openModal(`${dist} जिल्लाका उजुरीहरू`, content);
                };

                if (isHotspot) {
                    const rippleColorClass = isCritical ? 'red' : 'yellow';
                    const size = isCritical ? 18 : 14;
                    const rippleIcon = L.divIcon({
                        className: `ripple-marker ${rippleColorClass}`,
                        iconSize: [size, size]
                    });
                    marker = L.marker(coords, { icon: rippleIcon }).addTo(map);
                } else {
                    const radius = Math.min(30, 8 + count * 1.5);
                    const color = '#1976d2';
                    marker = L.circleMarker(coords, { radius: radius, fillColor: color, color: '#fff', weight: 1, opacity: 1, fillOpacity: 0.7 }).addTo(map);
                }
                
                marker.bindTooltip(`<strong>${dist}</strong><br>उजुरी संख्या: ${count}`, { direction: 'top' });
                marker.on('click', clickHandler);
            }
        });
        if (focusDistrict && DISTRICT_COORDINATES[focusDistrict]) { map.setView(DISTRICT_COORDINATES[focusDistrict], 10); }
        window.nvcMap = map;
    }, 300);
}

function updateMapFilter() { showToast('फिल्टर अपडेट गरियो', 'info'); }
function monitorHotspotAlerts() { /* Alert logic */ }
function loadDistricts() {
    const provinceSelect = document.getElementById('complaintProvince');
    const districtSelect = document.getElementById('complaintDistrict');
    if (!provinceSelect || !districtSelect) return;
    const provinceId = provinceSelect.value;
    districtSelect.innerHTML = '<option value="">जिल्ला छान्नुहोस्</option>';
    if (provinceId && LOCATION_FIELDS.DISTRICTS[provinceId]) {
        LOCATION_FIELDS.DISTRICTS[provinceId].forEach(dist => { const option = document.createElement('option'); option.value = dist; option.textContent = dist; districtSelect.appendChild(option); });
        districtSelect.disabled = false;
    } else { districtSelect.disabled = true; }
}
