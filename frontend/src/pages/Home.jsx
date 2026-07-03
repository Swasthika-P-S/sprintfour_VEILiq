import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import { Upload, FileText, CheckCircle, AlertTriangle, User, Eye, ShieldAlert, Sparkles, LogOut, ToggleLeft, ToggleRight, EyeOff, LayoutGrid, Diff, ShieldCheck, Swords, MessageCircle } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import PrivacyScore, { computePrivacyScore } from '../components/PrivacyScore';
import Timeline from '../components/Timeline';
import ExplainabilityPanel from '../components/ExplainabilityPanel';
import TrustDashboard from '../components/TrustDashboard';
import AuditReport from '../components/AuditReport';
import ReviewQueue from '../components/ReviewQueue';
import AliasResolver from '../components/AliasResolver';
import ConflictingContextResolver from '../components/ConflictingContextResolver';
import IntegrityVerifier from '../components/IntegrityVerifier';
import RedTeamPanel from '../components/RedTeamPanel';
import InterrogationChat from '../components/InterrogationChat';
import RiskToleranceProfile from '../components/RiskToleranceProfile';
import DiffView from '../components/DiffView';
import SandboxOnboarding from '../components/SandboxOnboarding';

import { useAuth } from '../context/AuthContext';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:7860/api';

function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-icon">
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { token } = useAuth();
  const { lang, t } = useLanguage();
  const langName = LANGUAGES.find(l => l.code === lang)?.label || 'English';

  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');

  const [entities, setEntities] = useState([]);
  const [safeEntities, setSafeEntities] = useState([]);       // Entities kept visible
  const [redactedSet, setRedactedSet] = useState(new Set());
  const [ignoredSet, setIgnoredSet] = useState(new Set());
  const [manuallyReviewedSet, setManuallyReviewedSet] = useState(new Set()); // Tracks all human decisions
  const [showKeptVisible, setShowKeptVisible] = useState(false); // Toggle for safe entity highlights
  
  // Processing States
  const [analyzed, setAnalyzed] = useState(false);
  const [timelineStep, setTimelineStep] = useState(-1);
  const [activeExplainTab, setActiveExplainTab] = useState('integrity'); // 'integrity', 'redteam', 'chat'

  const [context] = useState('healthcare');
  const [toasts, setToasts] = useState([]);
  const [riskThreshold, setRiskThreshold] = useState(80); // % confidence threshold for auto-redact

  const [selectedEntity, setSelectedEntity] = useState(null);
  const [popoverPos, setPopoverPos] = useState(null);
  const [aliasSuggestions, setAliasSuggestions] = useState([]);
  const [conflictingContexts, setConflictingContexts] = useState([]);
  const [fallbackMode, setFallbackMode] = useState(false);
  
  // Text Selection Explainability
  const [textSelection, setTextSelection] = useState(null);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  const handleFileResult = (data) => {
    setText(data.text);
    setFileName(data.filename);
    setEntities([]);
    setSafeEntities([]);
    setRedactedSet(new Set());
    setIgnoredSet(new Set());
    setManuallyReviewedSet(new Set());
    setPopoverPos(null);
    setAliasSuggestions([]);
    setConflictingContexts([]);
    setFallbackMode(false);
    setAnalyzed(false);
    setShowKeptVisible(false);
    
    // Start Timeline Animation
    setTimelineStep(0);
    setTimeout(() => setTimelineStep(1), 800);
    setTimeout(() => setTimelineStep(2), 1600);
    setTimeout(() => setTimelineStep(3), 2400);
    
    // Actually hit the API in the background while animating
    processTextWithAI(data.text);
  };

  const processTextWithAI = async (docText) => {
    try {
      const { data } = await axios.post(
        `${API}/analyze`,
        { text: docText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setTimeout(() => {
        setTimelineStep(4);
        setTimeout(() => {
          const fetchedEntities = data.entities || [];
          const fetchedSafe = data.safeEntities || [];
          let allFetchedEntities = [...fetchedEntities];
          const conflicts = data.conflicting_context || [];
          
          conflicts.forEach(conflict => {
             const occs = findAllOccurrences(docText, conflict.name);
             occs.forEach(occ => {
                const s = occ.index;
                const e = occ.index + occ.text.length;
                const overlaps = allFetchedEntities.some(ent => {
                   const es = ent.start ?? ent.startIndex ?? 0;
                   const ee = ent.end ?? ent.endIndex ?? 0;
                   return (s >= es && s < ee) || (e > es && e <= ee) || (s <= es && e >= ee);
                });
                if (!overlaps) {
                   const snippetStart = Math.max(0, s - 30);
                   const snippetEnd = Math.min(docText.length, e + 30);
                   const snippet = docText.substring(snippetStart, snippetEnd).replace(/\n/g, ' ');
                   const cType = conflict.type || 'ENTITY';
                   allFetchedEntities.push({
                     text: occ.text,
                     type: cType,
                     confidence: 70, // lower confidence forces human review
                     reason: `Conflicting context. Snippet: "...${snippet}..."`,
                     privacy_risk: 'Identity Tracking',
                     replacement: `[${cType}-X${Math.floor(Math.random()*100)}]`,
                     startIndex: s,
                     endIndex: e
                   });
                }
             });
          });
          
          allFetchedEntities.sort((a,b) => (a.startIndex - b.startIndex));

          setEntities(allFetchedEntities);
          setSafeEntities(fetchedSafe);
          setAliasSuggestions(data.suggested_aliases || []);
          setConflictingContexts(conflicts);
          setFallbackMode(data.fallbackMode || false);
          // Auto-redact based on current riskThreshold
          const autoRedact = new Set();
          allFetchedEntities.forEach((e, i) => { if (e.confidence >= riskThreshold) autoRedact.add(i); });
          setRedactedSet(autoRedact);
          setAnalyzed(true);
          setTimelineStep(-1);
          if (fetchedEntities.length > 0) {
            setSelectedEntity({ ...fetchedEntities[0], idx: 0 });
          } else if (fetchedSafe.length > 0) {
            setSelectedEntity({ ...fetchedSafe[0], isSafe: true, safeIdx: 0 });
          }
          if (data.fallbackMode) {
             addToast(`⚠️ AI engine temporarily unavailable — using pattern-based detection. Review all results manually.`, 'warning');
          } else if (data.ai_error) {
             addToast(`AI Engine warning — falling back to pattern detection.`, 'warning');
          } else {
             addToast(`Analysis complete — ${fetchedEntities.length} sensitive, ${fetchedSafe.length} evaluated & kept visible. Click any highlighted word to inspect.`);
          }
        }, 800);
      }, 1500);

    } catch (err) {
      setTimelineStep(-1);
      addToast(err.response?.data?.error || 'Analysis failed.', 'error');
    }
  };

  const toggleRedact = (idxOrArray) => {
    const indices = Array.isArray(idxOrArray) ? idxOrArray : [idxOrArray];
    setManuallyReviewedSet(prev => {
      const next = new Set(prev);
      indices.forEach(i => next.add(i));
      return next;
    });
    setRedactedSet((prev) => {
      const next = new Set(prev);
      indices.forEach(idx => {
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
      });
      return next;
    });
    setIgnoredSet((prev) => {
      const next = new Set(prev);
      indices.forEach(idx => next.delete(idx));
      return next;
    });
    if (!Array.isArray(idxOrArray) && selectedEntity?.idx === idxOrArray) {
       setSelectedEntity(prev => ({ ...prev, isRedacted: !redactedSet.has(idxOrArray) }));
    }
  };
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (selectedText.length > 2) {
      // Check if it overlaps with an existing mark
      const range = selection.getRangeAt(0);
      let parent = range.commonAncestorContainer;
      if (parent.nodeType === Node.TEXT_NODE) parent = parent.parentNode;
      
      if (parent.tagName === 'MARK') return;
      
      const rect = range.getBoundingClientRect();
      setTextSelection({ text: selectedText, x: rect.left + (rect.width / 2), y: rect.bottom + window.scrollY, loading: false, explanation: null });
    } else {
      if (textSelection && !textSelection.loading) {
        setTextSelection(null);
      }
    }
  };

  const explainTextSelection = async () => {
    if (!textSelection) return;
    setTextSelection({ ...textSelection, loading: true });
    try {
      const { data } = await axios.post(`${API}/analyze/explain-selection`, {
        selectedText: textSelection.text,
        context: text,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setTextSelection({ ...textSelection, loading: false, explanation: data });
    } catch (e) {
      console.error(e);
      addToast('Failed to analyze selection', 'error');
      setTextSelection({ ...textSelection, loading: false });
    }
  };

  const findAllOccurrences = (fullText, searchStr) => {
    const indices = [];
    if (!searchStr) return indices;
    let startIndex = 0;
    const lowerText = fullText.toLowerCase();
    const lowerSearch = searchStr.toLowerCase();
    while ((startIndex = lowerText.indexOf(lowerSearch, startIndex)) > -1) {
      indices.push({
        index: startIndex,
        text: fullText.substring(startIndex, startIndex + searchStr.length)
      });
      startIndex += searchStr.length;
    }
    return indices;
  };

  const manualRedactSelection = () => {
    if (!textSelection) return;
    const { text: selText } = textSelection;
    const occurrences = findAllOccurrences(text, selText);
    
    if (occurrences.length > 0) {
      const newEntities = [];
      for (const occ of occurrences) {
        const s = occ.index;
        const e = occ.index + occ.text.length;
        const overlaps = entities.some(ent => {
           const es = ent.start ?? ent.startIndex ?? 0;
           const ee = ent.end ?? ent.endIndex ?? 0;
           return (s >= es && s < ee) || (e > es && e <= ee) || (s <= es && e >= ee);
        });
        if (!overlaps) {
           newEntities.push({
             text: occ.text,
             type: 'MANUAL_REDACTION',
             confidence: 100,
             reason: 'Manually redacted by user',
             startIndex: s,
             endIndex: e,
             replacement: '[MANUAL_REDACT]'
           });
        }
      }
      
      if (newEntities.length > 0) {
        setEntities(prev => {
          const nextIdx = prev.length;
          setRedactedSet(rs => {
             const nrs = new Set(rs);
             for(let i=0; i<newEntities.length; i++) nrs.add(nextIdx + i);
             return nrs;
          });
          return [...prev, ...newEntities];
        });
        addToast(`Manual redaction applied to ${newEntities.length} occurrences.`, 'success');
        setTextSelection(null);
      }
    }
  };

  const toggleIgnore = (idxOrArray) => {
    const indices = Array.isArray(idxOrArray) ? idxOrArray : [idxOrArray];
    setManuallyReviewedSet(prev => {
      const next = new Set(prev);
      indices.forEach(i => next.add(i));
      return next;
    });
    setIgnoredSet((prev) => {
      const next = new Set(prev);
      indices.forEach(idx => {
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
      });
      return next;
    });
    setRedactedSet((prev) => {
      const next = new Set(prev);
      indices.forEach(idx => next.delete(idx));
      return next;
    });
    if (!Array.isArray(idxOrArray) && selectedEntity?.idx === idxOrArray) {
       setSelectedEntity(prev => ({ ...prev, isRedacted: false }));
    }
  };

  const redactAll = () => {
    const newRedacted = new Set();
    entities.forEach((_, i) => {
      if (!ignoredSet.has(i)) newRedacted.add(i);
    });
    setRedactedSet(newRedacted);
  };

  const clearAll = () => {
    setRedactedSet(new Set());
    setIgnoredSet(new Set());
  };

  const handleEntityClick = (seg) => {
    setSelectedEntity(seg);
  };

  const handleAliasConfirm = (idx, isSamePerson) => {
    const alias = aliasSuggestions[idx];
    const newSuggestions = [...aliasSuggestions];
    newSuggestions.splice(idx, 1);
    setAliasSuggestions(newSuggestions);

    const baseOccurrences = findAllOccurrences(text, alias.base_entity);
    const aliasOccurrences = findAllOccurrences(text, alias.text);
    const newEntities = [];
    
    let altReplacement = null;
    const existingAliasTag = entities.find(e => e.text.toLowerCase() === alias.text.toLowerCase() && e.replacement && e.replacement.match(/\[(NAME|PERSON)-\d+\]/i));
    if (existingAliasTag) {
        altReplacement = existingAliasTag.replacement;
    } else {
        let maxPersonIdx = 0;
        entities.forEach(e => {
          const m = (e.replacement || '').match(/\[(NAME|PERSON)-(\d+)\]/i);
          if (m) maxPersonIdx = Math.max(maxPersonIdx, parseInt(m[2], 10));
        });
        maxPersonIdx++;
        altReplacement = `[PERSON-${maxPersonIdx}]`;
    }

    let newReplacement = alias.proposed_replacement || '[PERSON-1]';
    const existingEntitiesToUpdate = [];

    // 1. Process Base Entity occurrences
    for (const occ of baseOccurrences) {
      const s = occ.index;
      const e = occ.index + occ.text.length;
      let overlappingIdx = -1;
      const overlaps = entities.some((ent, i) => {
         const es = ent.start ?? ent.startIndex ?? 0;
         const ee = ent.end ?? ent.endIndex ?? 0;
         if ((s >= es && s < ee) || (e > es && e <= ee) || (s <= es && e >= ee)) {
            overlappingIdx = i;
            return true;
         }
         return false;
      });
      
      const overlapsConflict = conflictingContexts.some(conf => {
        const cOccs = findAllOccurrences(text, conf.name);
        return cOccs.some(cOcc => {
           const cs = cOcc.index;
           const ce = cOcc.index + cOcc.text.length;
           return (s >= cs && s < ce) || (e > cs && e <= ce) || (s <= cs && e >= ce);
        });
      });

      if (!overlapsConflict) {
         if (overlaps) {
           existingEntitiesToUpdate.push({
             idx: overlappingIdx,
             replacement: alias.proposed_replacement || '[PERSON-1]',
             reason: 'Base entity resolved from alias.',
             confidence: 99
           });
         } else {
           newEntities.push({
             text: occ.text,
             startIndex: s, // Consistent property name
             endIndex: e,
             type: 'NAME',
             confidence: 99,
             reason: 'Base entity resolved from alias.',
             privacy_risk: 'Identity Tracking',
             replacement: alias.proposed_replacement || '[PERSON-1]'
           });
         }
      }
    }

    // 2. Process Alias occurrences
    for (const occ of aliasOccurrences) {
      const s = occ.index;
      const e = occ.index + occ.text.length;
      
      // Skip if it overlaps with an existing entity
      let overlappingIdx = -1;
      const overlaps = entities.some((ent, i) => {
         const es = ent.start ?? ent.startIndex ?? 0;
         const ee = ent.end ?? ent.endIndex ?? 0;
         if ((s >= es && s < ee) || (e > es && e <= ee) || (s <= es && e >= ee)) {
            overlappingIdx = i;
            return true;
         }
         return false;
      });
      
      // CRITICAL FIX: Skip if it overlaps with any pending Conflicting Context
      const overlapsConflict = conflictingContexts.some(conf => {
        const cOccs = findAllOccurrences(text, conf.name);
        return cOccs.some(cOcc => {
           const cs = cOcc.index;
           const ce = cOcc.index + cOcc.text.length;
           return (s >= cs && s < ce) || (e > cs && e <= ce) || (s <= cs && e >= ce);
        });
      });
      
      const overlapsNew = newEntities.some(ent => {
         const es = ent.start ?? ent.startIndex ?? 0;
         const ee = ent.end ?? ent.endIndex ?? 0;
         return (s >= es && s < ee) || (e > es && e <= ee) || (s <= es && e >= ee);
      });

      if (!overlapsNew && !overlapsConflict) {
         if (overlaps) {
           existingEntitiesToUpdate.push({
             idx: overlappingIdx,
             replacement: isSamePerson ? newReplacement : altReplacement,
             reason: isSamePerson ? (alias.reason || 'User confirmed alias.') : 'Unrelated person distinct from base entity.',
             confidence: 99
           });
         } else {
           newEntities.push({
             text: occ.text,
             startIndex: s,
             endIndex: e,
             type: 'NAME',
             confidence: 99,
             reason: isSamePerson ? (alias.reason || 'User confirmed alias.') : 'Unrelated person distinct from base entity.',
             privacy_risk: 'Identity Tracking',
             replacement: isSamePerson ? newReplacement : altReplacement
           });
         }
      }
    }

    if (newEntities.length > 0 || existingEntitiesToUpdate.length > 0) {
      setEntities(prev => {
        const updated = [...prev];
        
        // Apply updates to existing entities
        existingEntitiesToUpdate.forEach(update => {
           updated[update.idx] = { 
             ...updated[update.idx], 
             replacement: update.replacement, 
             confidence: update.confidence, 
             reason: update.reason 
           };
        });

        // Add entirely new entities
        const newlyAddedIndices = Array.from({length: newEntities.length}, (_, i) => updated.length + i);
        updated.push(...newEntities);
        setRedactedSet(rs => {
          const nextRs = new Set(rs);
          newlyAddedIndices.forEach(i => nextRs.add(i));
          return nextRs;
        });
        setManuallyReviewedSet(ms => {
          const nextMs = new Set(ms);
          newlyAddedIndices.forEach(i => nextMs.add(i));
          return nextMs;
        });
        return updated;
      });
      addToast(`Found and redacted ${newEntities.length} occurrences of "${alias.text}".`);
    } else {
      addToast(`No additional unredacted occurrences of "${alias.text}" found.`);
    }
  };

  const handleConflictResolve = (idx, decision, customMappings = {}, customOccurrences = []) => {
    const conflict = conflictingContexts[idx];
    const newConflicts = [...conflictingContexts];
    newConflicts.splice(idx, 1);
    setConflictingContexts(newConflicts);

    const occurrences = decision === 'CUSTOM' ? customOccurrences : findAllOccurrences(text, conflict.name);
    const newEntities = [];
    
    // When safe-by-default is active, these entities might ALREADY exist in `entities` array.
    // If we're updating them, we need to map over `entities` and update their replacements and confidences.
    
    setEntities(prev => {
      let updated = [...prev];
      let madeChanges = false;
      
      let maxPersonIdx = 0;
      updated.forEach(e => {
        const m = (e.replacement || '').match(/\[(NAME|PERSON)-(\d+)\]/i);
        if (m) maxPersonIdx = Math.max(maxPersonIdx, parseInt(m[2], 10));
      });
      
      // Helper to get mapping for an index
      const getCustomMapping = (startIndex) => {
         const oIdx = occurrences.findIndex(o => o.index === startIndex);
         return oIdx >= 0 ? customMappings[`${idx}-${oIdx}`] : null;
      };

      // Find all existing entities that match this conflict name and update them
      updated = updated.map(ent => {
        if (ent.text.toLowerCase() === conflict.name.toLowerCase()) {
          madeChanges = true;
          const cType = conflict.type === 'NAME' ? 'PERSON' : (conflict.type || 'ENTITY');
          if (decision === 'MERGE') {
            return { ...ent, replacement: `[${cType}-1]`, confidence: 99, reason: 'User confirmed same entity despite conflicting context.' };
          } else if (decision === 'SPLIT') {
            maxPersonIdx++;
            return { ...ent, replacement: `[${cType}-${maxPersonIdx}]`, confidence: 99, reason: 'User confirmed different entities.' };
          } else if (decision === 'UNSURE') {
            return { ...ent, confidence: 50, reason: 'Flagged for manual review due to conflicting context.' };
          } else if (decision === 'CUSTOM') {
            const mappedVal = getCustomMapping(ent.startIndex || ent.start || 0);
            if (mappedVal === 'NEW') {
              maxPersonIdx++;
              return { ...ent, replacement: `[${cType}-${maxPersonIdx}]`, confidence: 99, reason: 'User assigned distinct entity.' };
            } else if (mappedVal) {
              return { ...ent, replacement: mappedVal, confidence: 99, reason: 'User assigned existing entity.' };
            }
          }
        }
        return ent;
      });

      // If they weren't in entities yet, add them now
      if (!madeChanges) {
        for (let i = 0; i < occurrences.length; i++) {
          const occ = occurrences[i];
          const s = occ.index;
          const e = occ.index + occ.text.length;
          const overlaps = updated.some(ent => {
             const es = ent.start ?? ent.startIndex ?? 0;
             const ee = ent.end ?? ent.endIndex ?? 0;
             return (s >= es && s < ee) || (e > es && e <= ee) || (s <= es && e >= ee);
          });
          if (!overlaps) {
             const cType = conflict.type === 'NAME' ? 'PERSON' : (conflict.type || 'ENTITY');
             let rep = `[${cType}-1]`;
             let conf = 99;
             let reason = 'User confirmed same entity.';
             
             if (decision === 'SPLIT') {
               maxPersonIdx++;
               rep = `[${cType}-${maxPersonIdx}]`;
               reason = 'User confirmed different entities.';
             } else if (decision === 'UNSURE') {
               rep = `[${cType}-UNSURE]`;
               conf = 50;
               reason = 'Flagged for manual review due to conflicting context.';
             } else if (decision === 'CUSTOM') {
               const mappedVal = customMappings[`${idx}-${i}`];
               if (mappedVal === 'NEW') {
                 maxPersonIdx++;
                 rep = `[${cType}-${maxPersonIdx}]`;
                 reason = 'User assigned distinct entity.';
               } else if (mappedVal) {
                 rep = mappedVal;
                 reason = 'User assigned existing entity.';
               }
             }

             newEntities.push({
               text: occ.text,
               type: conflict.type || 'NAME',
               confidence: conf,
               reason: reason,
               privacy_risk: 'Identity Tracking',
               replacement: rep,
               startIndex: s,
               endIndex: e
             });
          }
        }
      }

      if (newEntities.length > 0) {
        const nextIdx = updated.length;
        updated = [...updated, ...newEntities];
        setRedactedSet(rs => {
          const nextRs = new Set(rs);
          for(let i=0; i<newEntities.length; i++) nextRs.add(nextIdx + i);
          return nextRs;
        });
        setManuallyReviewedSet(ms => {
          const nextMs = new Set(ms);
          for(let i=0; i<newEntities.length; i++) nextMs.add(nextIdx + i);
          return nextMs;
        });
      }

      return updated;
    });

    addToast(`Conflicting context resolved as: ${decision}`);
  };

  const buildDocSegments = () => {
    // Merge sensitive + safe entities into one sorted, non-overlapping list
    const sensitiveItems = entities.map((e, idx) => ({ ...e, idx, isSafe: false }));
    const safeItems = showKeptVisible
      ? safeEntities.map((e, safeIdx) => ({ ...e, safeIdx, isSafe: true, idx: null }))
      : [];

    const allItems = [...sensitiveItems, ...safeItems].sort((a, b) => {
      const aStart = a.startIndex ?? a.start ?? 0;
      const bStart = b.startIndex ?? b.start ?? 0;
      if (aStart === bStart) {
        const aEnd = a.endIndex ?? a.end ?? 0;
        const bEnd = b.endIndex ?? b.end ?? 0;
        return bEnd - aEnd; // longer comes first
      }
      return aStart - bStart;
    });

    const nonOverlapping = [];
    let lastEnd = -1;
    for (const e of allItems) {
      const s = e.startIndex ?? e.start ?? 0;
      const en = e.endIndex ?? e.end ?? 0;
      if (s >= lastEnd && en > s) {
        nonOverlapping.push(e);
        lastEnd = en;
      }
    }

    const segments = [];
    let cursor = 0;
    for (const e of nonOverlapping) {
      const s = e.startIndex ?? e.start ?? 0;
      const en = e.endIndex ?? e.end ?? 0;
      if (s > cursor) segments.push({ text: text.slice(cursor, s), idx: null });
      segments.push({
        ...e,
        text: text.slice(s, en),
        isRedacted: !e.isSafe && redactedSet.has(e.idx)
      });
      cursor = en;
    }
    if (cursor < text.length) segments.push({ text: text.slice(cursor), idx: null });
    return segments;
  };

  function getConfidenceColor(conf) {
    if (conf >= 98) return 'var(--conf-green)';
    if (conf >= 90) return 'var(--conf-yellow)';
    if (conf >= 70) return 'var(--conf-orange)';
    return 'var(--conf-red)';
  }

  const generateRedactedText = () => {
    return buildDocSegments().map(seg => {
      if (seg.isRedacted) return seg.replacement || `[${seg.type}]`;
      return seg.text;
    }).join('');
  };

  const handleDownloadTXT = () => {
    const content = generateRedactedText();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redacted_document_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    try {
      const redacted = generateRedactedText();
      const hiddenEntities = entities.filter((_, i) => redactedSet.has(i));
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.height;
      
      doc.setFontSize(16);
      doc.setTextColor(34, 197, 94);
      doc.text("VEILiq - Redacted Document", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      doc.text(`Original File: ${fileName || 'Untitled'}`, 14, 33);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 38, 196, 38);
      
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      
      // Split text into lines that fit the page width
      const splitText = doc.splitTextToSize(redacted, 180);
      let y = 48;
      
      splitText.forEach(line => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 14, y);
        y += 6; // line height
      });
      
      doc.save(`VEILiq_Redacted_${Date.now()}.pdf`);
      addToast('Redacted PDF downloaded!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to generate PDF.', 'error');
    }
  };

  return (
    <>
      <Toast toasts={toasts} />
      <div className="page-wrapper">
        {!analyzed && timelineStep === -1 && (
          <div className="landing-hero-section">
            <h1 className="landing-title">Trust No Box. Inspect Every Decision.</h1>
            <p className="landing-subtitle">Upload a confidential document and inspect every AI decision before downloading. No hidden decisions.</p>

            <FileUpload onResult={handleFileResult} onError={(msg) => addToast(msg, 'error')} />
          </div>
        )}

        {timelineStep !== -1 && (
          <Timeline />
        )}

        {analyzed && text && (
          <div className="split-layout">
            <div className="split-left">
              {fallbackMode && (
                <div style={{
                  background: 'linear-gradient(90deg, #92400e22, #92400e11)',
                  border: '1px solid #F59E0B88',
                  borderRadius: 10,
                  padding: '10px 16px',
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '0.85rem',
                  color: '#F59E0B'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                  <span><strong>AI engine temporarily unavailable</strong> — using pattern-based detection with reduced accuracy. Results should be manually reviewed before downloading.</span>
                </div>
              )}
              <div className="doc-card-flat" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 600 }}>
                <div style={{ paddingBottom: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px' }} onClick={redactAll}>
                          <ShieldAlert size={16} /> Hide All PII
                        </button>
                        <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px' }} onClick={clearAll}>
                          <Eye size={16} /> Keep All
                        </button>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px' }} onClick={handleDownloadTXT}>
                          <FileText size={16} /> Save TXT
                        </button>
                        <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px' }} onClick={handleDownloadPDF}>
                          <FileText size={16} /> Export Report
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', paddingTop: 16 }}>
                  <div className="doc-viewer premium-viewer" onMouseUp={handleTextSelection}>
                    {buildDocSegments().map((seg, i) => {
                      // Plain text segments
                      if (seg.idx === null && !seg.isSafe) {
                        return (
                          <span key={i}>
                            {seg.text.split('\n').map((line, j, arr) => {
                              const isHeading = /^(Section \d+:|Batch [A-Z])/i.test(line);
                              const isNote = line.trim().startsWith('Note:');
                              return (
                                <React.Fragment key={j}>
                                  {isHeading ? <strong style={{ color: 'var(--primary)', fontSize: '1.05em' }}>{line}</strong> 
                                  : isNote ? <em style={{ color: 'var(--text-muted)' }}>{line}</em> 
                                  : line}
                                  {j < arr.length - 1 && '\n'}
                                </React.Fragment>
                              );
                            })}
                          </span>
                        );
                      }
                      
                      const isSelected = selectedEntity?.idx === seg.idx && !seg.isSafe ||
                        (seg.isSafe && selectedEntity?.isSafe && selectedEntity?.text === seg.text);
                      const confColor = seg.isSafe ? 'var(--conf-green)' : getConfidenceColor(seg.confidence);
                      
                      return (
                        <mark
                          key={i}
                          title={seg.reason}
                          className={`entity-mark ${seg.isRedacted ? 'redacted' : ''} ${isSelected ? 'selected' : ''} ${seg.isSafe ? 'safe-visible' : ''}`}
                          style={{ borderBottom: `2px ${seg.isSafe ? 'dashed' : 'solid'} ${confColor}` }}
                          onClick={(e) => {
                            setSelectedEntity({...seg, idx: seg.idx, isRedacted: seg.isRedacted, isSafe: seg.isSafe});
                            setPopoverPos({ x: e.clientX, y: e.clientY });
                          }}
                        >
                          {seg.isRedacted ? (seg.replacement || `[${seg.type}]`) : seg.text}
                        </mark>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="split-right">
              <TrustDashboard metrics={{
                totalFound: entities.length,
                hidden: redactedSet.size,
                reviewRequired: entities.filter((e, idx) => e.confidence < 90 && !redactedSet.has(idx) && !ignoredSet.has(idx)).length + aliasSuggestions.length + conflictingContexts.length,
                humanApproved: manuallyReviewedSet.size,
                keptVisible: safeEntities.length,
                score: computePrivacyScore(entities.filter((_, i) => !redactedSet.has(i)), entities.length, context),
                entities: entities,
              }} />


              <AliasResolver
                aliases={aliasSuggestions}
                onResolve={handleAliasConfirm}
              />

              <ConflictingContextResolver 
                conflicts={conflictingContexts} 
                onResolve={handleConflictResolve} 
                entities={entities}
                text={text}
              />

              <ReviewQueue  
                entities={entities} 
                redactedSet={redactedSet} 
                ignoredSet={ignoredSet}
                onToggleRedact={toggleRedact}
                onToggleIgnore={toggleIgnore}
                onSelect={handleEntityClick}
                fallbackMode={fallbackMode}
              />
            </div>
          </div>
        )}

        {/* Ad-hoc Selection Popover */}
      {textSelection && (
        <div 
          className="inline-popover glass-card"
          style={{
            position: 'absolute',
            top: textSelection.y + 12,
            left: textSelection.x,
            transform: 'translateX(-50%)',
            zIndex: 100,
            width: 340,
            padding: 16,
            borderRadius: 12,
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-dark)', marginBottom: 4 }}>
              Selected Text
            </div>
            <div style={{ background: 'var(--bg-muted)', padding: 8, borderRadius: 6, fontSize: '0.85rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {textSelection.text}
            </div>
          </div>
          
          {textSelection.loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <div className="spinner" style={{ width: 14, height: 14, border: '2px solid var(--text-muted)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              Analyzing context...
            </div>
          ) : textSelection.explanation ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.5 }}>
                <strong>Why wasn't this flagged?</strong><br/>
                {textSelection.explanation.missReason}
              </div>
              
              {textSelection.explanation.isPII && (
                <div style={{ background: 'var(--conf-orange-bg)', border: '1px solid var(--conf-orange)', padding: 8, borderRadius: 6, fontSize: '0.8rem', color: 'var(--conf-orange)' }}>
                  <strong>Warning:</strong> This appears to be a missed entity ({textSelection.explanation.confidence}% confidence).
                </div>
              )}
              
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1, padding: '6px' }} onClick={() => setTextSelection(null)}>
                  Dismiss
                </button>
                <button className="btn btn-primary btn-sm" style={{ flex: 1, padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }} onClick={manualRedactSelection}>
                  <ShieldAlert size={14} /> Manual Redact
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => setTextSelection(null)}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={explainTextSelection}>
                <Sparkles size={14} /> Why wasn't this flagged?
              </button>
            </div>
          )}
        </div>
      )}

      {/* Existing Entity Popover */}
      {selectedEntity && popoverPos && !textSelection && (
        <>
            <div style={{position: 'fixed', inset: 0, zIndex: 9998}} onClick={() => setPopoverPos(null)} />
            <div className="glass-card" style={{
              position: 'fixed',
              top: Math.min(popoverPos.y + 15, window.innerHeight - 300),
              left: Math.min(popoverPos.x + 15, window.innerWidth - 350),
              zIndex: 9999,
              width: 340,
              padding: '16px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <h4 style={{ margin: 0, color: 'var(--text-dark)', fontSize: '1.1rem', wordBreak: 'break-all' }}>{selectedEntity.text}</h4>
                <div className="decision-badge" style={{
                  padding: '4px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700,
                  background: selectedEntity.isSafe ? 'rgba(52,211,153,0.1)' : (selectedEntity.isRedacted ? 'var(--conf-red-bg)' : 'rgba(245,158,11,0.1)'),
                  color: selectedEntity.isSafe ? 'var(--conf-green)' : (selectedEntity.isRedacted ? 'var(--conf-red)' : 'var(--conf-orange)'),
                  border: '1px solid',
                  borderColor: selectedEntity.isSafe ? 'var(--conf-green)' : (selectedEntity.isRedacted ? 'var(--conf-red)' : 'var(--conf-orange)')
                }}>
                  {selectedEntity.isSafe ? 'KEPT VISIBLE' : (selectedEntity.isRedacted ? 'HIDDEN' : 'NEEDS REVIEW')}
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                {selectedEntity.reason}
                {!selectedEntity.isSafe && !selectedEntity.isRedacted && (
                  <span style={{ display: 'block', marginTop: 8, color: 'var(--conf-orange)', fontWeight: 600 }}>
                    Visible because confidence ({selectedEntity.confidence}%) is below your {riskThreshold}% threshold.
                  </span>
                )}
              </p>

              {!selectedEntity.isSafe && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {!selectedEntity.isRedacted && (
                    <button className="btn btn-outline" style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => { toggleIgnore(selectedEntity.idx); setPopoverPos(null); }}>
                      Keep Visible
                    </button>
                  )}
                  <button className="btn btn-primary" style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => { toggleRedact(selectedEntity.idx); setPopoverPos(null); }}>
                    {selectedEntity.isRedacted ? 'Un-Hide' : 'Hide'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {analyzed && text && (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Explainability Sidebar */}
              <div className="glass-card" style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200, flexShrink: 0 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, padding: '0 8px', marginBottom: 4 }}>
                  Explainability Tools
                </div>
                {[

                  { id: 'integrity', label: 'Integrity Verifier', icon: <ShieldCheck size={18} /> },
                  { id: 'redteam', label: 'Red Team', icon: <Swords size={18} /> },
                  { id: 'chat', label: 'Ask VEILiq', icon: <MessageCircle size={18} /> },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveExplainTab(tab.id)}
                    className="sidebar-tab-btn"
                    style={{
                      padding: '12px 16px', borderRadius: 12, fontSize: '0.85rem', fontWeight: activeExplainTab === tab.id ? 700 : 600, border: 'none', cursor: 'pointer',
                      background: activeExplainTab === tab.id ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
                      color: activeExplainTab === tab.id ? 'var(--conf-green)' : 'var(--text-muted)',
                      transition: 'all 0.2s', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      borderLeft: activeExplainTab === tab.id ? '3px solid var(--conf-green)' : '3px solid transparent'
                    }}
                    onMouseEnter={e => {
                      if (activeExplainTab !== tab.id) {
                        e.currentTarget.style.background = 'var(--bg-muted)';
                        e.currentTarget.style.color = 'var(--text-dark)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (activeExplainTab !== tab.id) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-muted)';
                      }
                    }}
                  >
                    <span style={{ color: activeExplainTab === tab.id ? 'var(--conf-green)' : 'var(--text-faint)' }}>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Render Active Tab */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>

                {activeExplainTab === 'integrity' && (
                  <IntegrityVerifier
                    originalText={text}
                    redactedText={generateRedactedText()}
                    entities={entities}
                    redactedIndices={[...redactedSet]}
                    token={token}
                  />
                )}
                {activeExplainTab === 'redteam' && (
                  <RedTeamPanel
                    redactedText={generateRedactedText()}
                    entities={entities}
                    redactedIndices={[...redactedSet]}
                    token={token}
                  />
                )}

                {activeExplainTab === 'chat' && (
                  <InterrogationChat
                    entities={entities}
                    safeEntities={safeEntities}
                    redactedIndices={[...redactedSet]}
                    aliasSuggestions={aliasSuggestions}
                    token={token}
                  />
                )}
              </div>
            </div>
            <AuditReport entities={entities} safeEntities={safeEntities} redactedSet={redactedSet} />
          </div>
        )}
      </div>
    </>
  );
}
