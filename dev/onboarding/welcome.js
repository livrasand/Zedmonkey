document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const stepIndicators = document.querySelectorAll('.step-indicator');
    const stepContents = document.querySelectorAll('.step-content');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const skipBtn = document.getElementById('skip-btn');
    const exampleBtn = document.getElementById('example-btn');
    
    // Estado actual
    let currentStep = 1;
    let totalSteps = stepContents.length;
    
    // Métricas
    let metrics = {
        startTime: Date.now(),
        stepsViewed: [1],
        completed: false,
        skipped: false
    };
    
    // Función para actualizar el paso actual
    function updateStep(step) {
        // Actualizar indicadores
        stepIndicators.forEach(indicator => {
            indicator.classList.remove('active');
            if (parseInt(indicator.dataset.step) === step) {
                indicator.classList.add('active');
            }
        });
        
        // Actualizar contenido
        stepContents.forEach((content, index) => {
            content.classList.remove('active');
            if (index + 1 === step) {
                content.classList.add('active');
            }
        });
        
        // Actualizar botones
        prevBtn.disabled = step === 1;
        nextBtn.textContent = step === totalSteps ? 'Finalizar' : 'Siguiente';
        
        // Registrar métrica
        if (!metrics.stepsViewed.includes(step)) {
            metrics.stepsViewed.push(step);
        }
        
        // Guardar el paso actual
        currentStep = step;
    }
    
    // Event listeners para los botones de navegación
    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            updateStep(currentStep - 1);
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentStep < totalSteps) {
            updateStep(currentStep + 1);
        } else {
            // Finalizar onboarding
            completeOnboarding(true);
        }
    });
    
    // Event listener para los indicadores de paso
    stepIndicators.forEach(indicator => {
        indicator.addEventListener('click', () => {
            const step = parseInt(indicator.dataset.step);
            updateStep(step);
        });
    });
    
    // Event listener para el botón de saltar
    skipBtn.addEventListener('click', () => {
        metrics.skipped = true;
        completeOnboarding(false);
    });
    
    // Event listener para el botón de ejemplo
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
        
        // Guardar el script en el almacenamiento local
        chrome.storage.local.set({
            tempScriptContent: exampleScript
        }, () => {
            // Abrir el editor con el script cargado
            chrome.tabs.create({
                url: chrome.runtime.getURL("editor/editor.html?loadTemp=true")
            });
            
            // Registrar métrica
            metrics.viewedExample = true;
            saveMetrics();
        });
    });
    
    // Función para completar el onboarding
    function completeOnboarding(completed) {
        // Actualizar métricas
        metrics.completed = completed;
        metrics.endTime = Date.now();
        metrics.duration = metrics.endTime - metrics.startTime;
        
        // Guardar métricas
        saveMetrics();
        
        // Marcar onboarding como completado
        chrome.storage.local.set({ 'onboardingCompleted': true }, () => {
            // Cerrar la página o redirigir
            window.close();
        });
    }
    
    // Función para guardar métricas
    function saveMetrics() {
        chrome.storage.local.get('onboardingMetrics', (data) => {
            const allMetrics = data.onboardingMetrics || [];
            allMetrics.push(metrics);
            chrome.storage.local.set({ 'onboardingMetrics': allMetrics });
        });
    }
    
    // Inicializar
    updateStep(1);
});