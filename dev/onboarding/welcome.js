// Función optimizada para reemplazar textos i18n
function i18nReplace() {
  document.querySelectorAll('[class^="__MSG_"], [id^="__MSG_"], [data-i18n]').forEach(el => {
    const key = el.dataset.i18n || el.id.replace('__MSG_', '').replace('__', '') || el.className.replace('__MSG_', '').replace('__', '');
    if (key) {
      const msg = chrome.i18n.getMessage(key);
      if (msg) el.textContent = msg;
    }
  });

  // Reemplazar textos en nodos de texto
  document.querySelectorAll('h1, h2, p, button, span').forEach(el => {
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const match = node.textContent.trim().match(/^__MSG_(\w+)__$/);
        if (match) {
          const msg = chrome.i18n.getMessage(match[1]);
          if (msg) node.textContent = msg;
        }
      }
    }
  });

  document.documentElement.lang = chrome.i18n.getMessage('htmlLang') || 'en';
  document.title = chrome.i18n.getMessage('title') || document.title;
}

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar traducciones
  i18nReplace();
  
  // Elementos del DOM (cache para mejor rendimiento)
  const stepIndicators = document.querySelectorAll('.step-indicator');
  const stepContents = document.querySelectorAll('.step-content');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const skipBtn = document.getElementById('skip-btn');
  const exampleBtn = document.getElementById('example-btn');
  
  // Estado actual
  let currentStep = 1;
  const totalSteps = stepContents.length;
  
  // Métricas simplificadas
  const startTime = Date.now();
  const stepsViewed = [1];
  
  // Función para actualizar el paso actual (optimizada)
  function updateStep(step) {
    // Actualizar indicadores y contenido
    stepIndicators.forEach(indicator => {
      indicator.classList.toggle('active', parseInt(indicator.dataset.step) === step);
    });
    
    stepContents.forEach((content, index) => {
      content.classList.toggle('active', index + 1 === step);
    });
    
    // Actualizar botones
    prevBtn.disabled = step === 1;
    nextBtn.textContent = step === totalSteps ? chrome.i18n.getMessage('finish') || 'Finalizar' : chrome.i18n.getMessage('next') || 'Siguiente';
    
    // Registrar métrica sin duplicados
    if (!stepsViewed.includes(step)) {
      stepsViewed.push(step);
    }
    
    // Actualizar paso actual
    currentStep = step;
  }
  
  // Event listeners para navegación
  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) updateStep(currentStep - 1);
  });
  
  nextBtn.addEventListener('click', () => {
    if (currentStep < totalSteps) {
      updateStep(currentStep + 1);
    } else {
      // Finalizar onboarding
      completeOnboarding(true);
    }
  });
  
  // Event listener para indicadores de paso
  stepIndicators.forEach(indicator => {
    indicator.addEventListener('click', () => {
      updateStep(parseInt(indicator.dataset.step));
    });
  });
  
  // Event listener para saltar
  skipBtn.addEventListener('click', () => {
    completeOnboarding(false);
  });
  
  // Event listener para ejemplo (script simplificado)
  exampleBtn.addEventListener('click', () => {
    // Script de ejemplo básico
    const exampleScript = `// ==UserScript==
// @name         Mi Primer Script
// @namespace    zedmonkey
// @version      1.0
// @description  Un script de ejemplo para Zedmonkey
// @author       Usuario de Zedmonkey
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // Crear un elemento de mensaje
    const messageDiv = document.createElement('div');
    messageDiv.style.position = 'fixed';
    messageDiv.style.bottom = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.padding = '10px 20px';
    messageDiv.style.backgroundColor = '#3498db';
    messageDiv.style.color = 'white';
    messageDiv.style.borderRadius = '5px';
    messageDiv.style.zIndex = '9999';
    messageDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    messageDiv.textContent = '¡Hola desde Zedmonkey! Este es un script de ejemplo.';
    
    // Añadir al documento
    document.body.appendChild(messageDiv);
    
    // Eliminar después de 5 segundos
    setTimeout(() => {
        messageDiv.style.transition = 'opacity 0.5s';
        messageDiv.style.opacity = '0';
        setTimeout(() => messageDiv.remove(), 500);
    }, 5000);
})();`;
    
    // Guardar y abrir
    chrome.storage.local.set({ tempScriptContent: exampleScript }, () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("editor/editor.html?loadTemp=true") });
    });
  });
  
  // Función para completar el onboarding (simplificada)
  function completeOnboarding(completed) {
    // Guardar estado mínimo necesario
    chrome.storage.local.set({ 
      'onboardingCompleted': true,
      'onboardingMetrics': {
        completed: completed,
        duration: Date.now() - startTime,
        stepsViewed: stepsViewed
      }
    }, () => {
      window.close();
    });
  }
  
  // Inicializar
  updateStep(1);
});