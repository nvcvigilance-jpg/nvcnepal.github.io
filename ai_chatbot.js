(function(){
  if (typeof window === 'undefined') return;
  window.NVC = window.NVC || {};
  NVC.Chatbot = NVC.Chatbot || {};

  // Simple, safer copy of the AI helpers from script.js
  NVC.Chatbot.AI_SYSTEM = NVC.Chatbot.AI_SYSTEM || {
    keywords: {
      high: ['तुरुन्त','अति','गम्भीर','भ्रष्टाचार','घूस','ज्यान','जोखिम','urgent','corruption'],
      medium: ['समस्या','ढिला','अनियमितता','गुनासो','delay']
    },

    analyzeComplaint: function(description){
      if (!description) return { priority: 'साधारण', category: 'अन्य', classification: 'अन्य', summary: '', sentiment: 'तटस्थ', entities: [] };
      let score = 0;
      const text = description.toLowerCase();
      this.keywords.high.forEach(k=>{ if (text.includes(k)) score += 3; });
      this.keywords.medium.forEach(k=>{ if (text.includes(k)) score += 1; });
      const priority = score >= 3 ? 'उच्च' : (score >=1 ? 'मध्यम' : 'साधारण');
      const summary = description.split(/[।?!.]/)[0] || description.substring(0,80);
      return { priority, category: 'अन्य', classification: 'अन्य', summary, sentiment: 'तटस्थ', entities: [], score };
    },

    getChatResponse: function(input){
      input = (input||'').toLowerCase();
      const state = NVC.State && NVC.State.state ? NVC.State.state : {};
      if (!input.trim()) return 'कृपया केही लेख्नुहोस्।';
      if (/(नमस्ते|hello|hi|namaste|नमस्कार)/.test(input)) return 'नमस्ते! म NVC AI सहायक हुँ।';
      if (/(कति|how many|count|kati)/.test(input) && /(बाँकी|pending|remaining|banki)/.test(input)){
        const pending = (state.complaints||[]).filter(c=>c.status==='pending').length;
        return `हाल प्रणालीमा <strong>${pending}</strong> वटा उजुरी फछ्रयौट हुन बाँकी छन्।`;
      }
      return 'माफ गर्नुहोस् — म त्यो प्रश्न बुझ्न सकेन।';
    }
  };

})();
