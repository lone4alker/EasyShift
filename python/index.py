#!/usr/bin/env python3
"""
Smart AI Staff Schedule Optimization Server
-------------------------------------------
✅ Filters out days with no predictions & no shifts
✅ Handles staff availability, fairness, payroll
✅ Works with explicit feature_lookup dates
✅ NEW: Business-type aware role mix & staffing
✅ NEW: Role-aware staff selection (skills/roles)
✅ NEW: Optional LLM-style post-processing hook (no external calls by default)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import logging

# ---------------------------------
# Flask Setup
# ---------------------------------
app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Toggle this to True after wiring a real LLM in llm_post_process()
USE_LLM_POST = False

# ---------------------------------
# Data Models
# ---------------------------------
@dataclass
class StaffMember:
    staff_id: str
    name: str
    hourly_rate: float
    max_hours_per_week: int
    preferred_shifts: List[str]
    unavailable_days: List[str]
    roles: List[str] = field(default_factory=lambda: ["general"])  # NEW
    weekly_hours: float = 0.0

@dataclass
class Shift:
    shift_id: str
    staff_id: str
    date: str
    start_time: str
    end_time: str
    role: str
    is_owner_created: bool = True
    is_optimized: bool = False

# ---------------------------------
# Schedule Engine
# ---------------------------------
class ScheduleEngine:
    def _init_(self, model_path: str = "staff_rf_model.pkl"):
        self.model = self._load_model_or_demo(model_path)
        self.model_features = [
            "store_id","store_size_sqft","day_of_week","is_weekend","sales",
            "diwali_flag","holi_flag","eid_flag","christmas_flag","independence_flag",
            "month","year","dayofmonth","weekofyear",
            "city_Hyderabad","city_Mumbai","city_Pune"
        ]
        self.shift_templates = {
            "morning":  ("08:00", "16:00"),
            "afternoon":("12:00", "20:00"),
            "evening":  ("14:00", "22:00"),
            "full_day": ("09:00", "17:00")
        }
        # Default role->shift template (fallback if no preferred shift)
        self.role_shift_templates = {
            "cashier": ("09:00","17:00"),
            "picker": ("08:00","16:00"),
            "packer_fragile": ("12:00","20:00"),
            "qc": ("10:00","18:00"),
            "floor_exec": ("11:00","19:00"),
            "delivery": ("14:00","22:00"),
            "general": ("09:00","17:00")
        }
        self.max_hours_per_day = 10

    # --- Model or demo predictor
    def _load_model_or_demo(self, path):
        try:
            return joblib.load(path)
        except Exception:
            logger.warning("⚠ Model not found, using demo predictor.")
            from sklearn.ensemble import RandomForestRegressor
            import numpy as np
            demo = RandomForestRegressor(n_estimators=5, random_state=42)
            X = np.array([[1,3500,4,0],[1,3500,6,1]])
            y = np.array([4.0,8.0])
            demo.fit(X,y)
            class Wrapper:
                def predict(self,X):
                    df = pd.DataFrame(X)
                    sales = df.get("sales", pd.Series([20000]*len(df)))
                    weekend = df.get("is_weekend", pd.Series([0]*len(df)))
                    diwali  = df.get("diwali_flag", pd.Series([0]*len(df)))
                    base = (sales/8000) + weekend*2 + diwali*3
                    return base.clip(1,20)
            return Wrapper()

    # --- Public API
    def optimize(self, staff_data, schedule_data, feature_lookup, business_type: Optional[str] = None):
        staff  = self._to_staff(staff_data)
        shifts = self._to_shifts(schedule_data)
        feats  = self._normalize_features(feature_lookup, schedule_data)
        preds  = self._predict(feats)
        optimized, changes = self._apply_optimization(shifts, staff, preds, business_type)
        result = self._build_output(staff, shifts, optimized, preds, changes, business_type)
        # Optional LLM-style post-process (non-ML). No external calls by default.
        result = self._maybe_llm_post_process(result, business_type)
        return result

    def update_schedule(self, staff_data, schedule_data, feature_lookup, update, business_type: Optional[str] = None):
        staff  = self._to_staff(staff_data)
        shifts = self._to_shifts(schedule_data)
        feats  = self._normalize_features(feature_lookup, schedule_data)
        preds  = self._predict(feats)
        changes = []
        if update.get("update_type") == "staff_unavailable":
            shifts, extra = self._apply_staff_unavailability(
                update["date"], update["staff_id"], shifts, staff, business_type)
            opt, ch = self._apply_optimization(shifts, staff, preds, business_type)
            optimized, changes = opt, ch + extra
        else:
            optimized, changes = self._apply_optimization(shifts, staff, preds, business_type)
        result = self._build_output(staff, shifts, optimized, preds, changes, business_type)
        result = self._maybe_llm_post_process(result, business_type)
        return result

    # --- Converters
    def _to_staff(self, raw):
        out = []
        for s in raw:
            if isinstance(s, StaffMember):
                out.append(s)
            else:
                # roles may be missing; default handled by dataclass
                if "roles" not in s or s["roles"] is None:
                    s = {**s, "roles": ["general"]}
                out.append(StaffMember(**s))
        return out

    def _to_shifts(self, raw):
        out = []
        for s in raw:
            if isinstance(s, Shift):
                out.append(s)
            else:
                out.append(Shift(**s))
        return out

    # --- Feature Normalization
    def _normalize_features(self, features, schedule):
        """Return only dates that have either features or shifts."""
        out = {}
        if isinstance(features, dict):
            # Allow either {date: {...}} or {"2025-09-27":{...}}
            for k,v in features.items():
                if isinstance(v, dict):
                    out[k] = v
        elif isinstance(features, list):
            for item in features:
                if isinstance(item, dict) and "date" in item:
                    feats = item.get("features") or {k:v for k,v in item.items() if k!="date"}
                    out[item["date"]] = feats
        # include schedule dates only if they contain shifts
        for s in schedule:
            d = s.get("date")
            if d and s.get("shifts"):
                out.setdefault(d, {})
        return out

    def _predict(self, features):
        out = {}
        for d,f in features.items():
            df = pd.DataFrame([f])
            for col in self.model_features:
                if col not in df: df[col] = 0
            try:
                base = float(self.model.predict(df[self.model_features])[0])
            except Exception:
                base = 3
            
            # Apply day and holiday multipliers
            dayname = datetime.strptime(d,"%Y-%m-%d").strftime("%A").lower()
            if "saturday" in dayname or "sunday" in dayname: base *= 1.2
            if f.get("diwali_flag") or f.get("christmas_flag"): base *= 1.5
            
            # Consider available staff count - don't predict more than available
            available_staff = f.get("available_staff_count", 0)
            total_staff = f.get("total_staff_count", 0)
            
            if available_staff > 0 and total_staff > 0:
                # Cap prediction to available staff, but ensure at least 1 if staff exists
                base = min(base, available_staff)
                base = max(1, base)  # Ensure at least 1 if staff exists
            elif total_staff > 0:
                # If no available staff but total staff exists, predict minimum
                base = 1
            else:
                # No staff at all
                base = 0
            
            out[d] = max(0, int(round(base)))
        return out

    # --- Utilities
    def _group_by_date(self, shifts):
        g = {}
        for s in shifts: g.setdefault(s.date, []).append(s)
        return g

    def _hours(self, s, e):
        try:
            s = datetime.strptime(s, "%H:%M"); e = datetime.strptime(e, "%H:%M")
            return (e - s).seconds / 3600
        except:
            return 8

    def _extend_time(self, end, add):
        return (datetime.strptime(end, "%H:%M")+timedelta(hours=add)).strftime("%H:%M")

    def _cost(self, shift, staff):
        s = next((x for x in staff if x.staff_id == shift.staff_id), None)
        return 0 if not s else round(self._hours(shift.start_time, shift.end_time)*s.hourly_rate, 2)

    # --- Business-type role mix rules (core of new behavior)
    def _role_mix(self, date: str, predicted: int, business_type: Optional[str], features: Dict[str, Any]) -> Dict[str, int]:
        """
        Returns role->required_count for the given date based on business_type.
        Purely heuristic, non-ML, easy to extend.
        """
        dayname = datetime.strptime(date, "%Y-%m-%d").strftime("%A").lower()
        weekend = 1 if dayname in ("saturday","sunday") else 0
        diwali = 1 if features.get("diwali_flag") else 0

        def cap_counts(mix: Dict[str, float]) -> Dict[str, int]:
            # Normalize to integer counts and ensure sum ~ predicted
            # Strategy: round, then adjust by adding/removing from largest roles
            if predicted <= 0: return {}
            ints = {r: max(0, int(round(c))) for r, c in mix.items()}
            total = sum(ints.values())
            if total == 0:
                # fallback: at least 1 general
                return {"general": predicted}
            # adjust
            if total < predicted:
                # add to roles with biggest fractional need (use current ints as base)
                need = predicted - total
                for _ in range(need):
                    # choose role with max current count (frontline bias)
                    r = max(ints.keys(), key=lambda k: ints[k])
                    ints[r] += 1
            elif total > predicted:
                extra = total - predicted
                for _ in range(extra):
                    # remove from role with max count but keep >=0
                    r = max(ints.keys(), key=lambda k: ints[k])
                    if ints[r] > 0:
                        ints[r] -= 1
            return ints

        bt = (business_type or "general").lower()

        # Default generic retail split
        mix = {
            "cashier": 0.35 * predicted,
            "floor_exec": 0.35 * predicted,
            "picker": 0.15 * predicted,
            "qc": 0.05 * predicted,
            "delivery": 0.10 * predicted
        }

        if bt in ("electronics","electronics_fragile","electronics-fragile","electronics_with_fragile","electronics (fragile)"):
            # Electronics + fragile shipping → enforce packing fragile & QC presence
            base = predicted
            mix = {
                "cashier": 0.25 * base,
                "floor_exec": 0.25 * base,
                "picker": 0.15 * base,
                "packer_fragile": 0.20 * base,
                "qc": 0.10 * base,
                "delivery": 0.05 * base
            }
            if weekend:  # more footfall; push cashier/floor
                mix["cashier"] += 0.05 * base
                mix["floor_exec"] += 0.05 * base
                # steal from picker/delivery to keep total similar
                mix["picker"] -= 0.03 * base
                mix["delivery"] -= 0.07 * base
            if diwali:   # big-ticket festive sensitivity → more QC/fragile packing
                mix["qc"] += 0.05 * base
                mix["packer_fragile"] += 0.05 * base
                mix["floor_exec"] -= 0.05 * base
                mix["picker"] -= 0.05 * base

        elif bt in ("grocery","supermarket"):
            mix = {
                "cashier": 0.30 * predicted,
                "floor_exec": 0.30 * predicted,
                "picker": 0.25 * predicted,
                "delivery": 0.10 * predicted,
                "qc": 0.05 * predicted
            }
            if weekend:
                mix["cashier"] += 0.05 * predicted
                mix["floor_exec"] += 0.05 * predicted
                mix["picker"] -= 0.05 * predicted
                mix["delivery"] -= 0.05 * predicted

        elif bt in ("restaurant","cafe","qsr"):
            mix = {
                "cashier": 0.20 * predicted,
                "floor_exec": 0.30 * predicted,  # servers
                "picker": 0.00,
                "delivery": 0.25 * predicted,
                "qc": 0.05 * predicted,
                "general": 0.20 * predicted      # kitchen/back
            }

        elif bt in ("pharmacy","chemists"):
            mix = {
                "cashier": 0.25 * predicted,
                "floor_exec": 0.25 * predicted,
                "picker": 0.20 * predicted,
                "qc": 0.10 * predicted,
                "delivery": 0.20 * predicted
            }

        elif bt in ("fashion","clothing","apparel"):
            mix = {
                "cashier": 0.30 * predicted,
                "floor_exec": 0.50 * predicted,
                "qc": 0.05 * predicted,
                "picker": 0.00,
                "delivery": 0.00,
                "general": 0.15 * predicted
            }
            if weekend:
                mix["floor_exec"] += 0.1 * predicted
                mix["general"] -= 0.1 * predicted

        # finalize to ints with sum close to predicted
        return cap_counts({k: max(0.0, v) for k, v in mix.items()})

    # --- Staff selection fairness (role-aware)
    def _select_staff_for_role(self, date: str, staff: List[StaffMember], count: int, role: str) -> List[StaffMember]:
        day = datetime.strptime(date, "%Y-%m-%d").strftime("%A").lower()
        date_str = date
        
        avail = []
        for s in staff:
            # Check basic availability
            is_available = True
            
            # Check unavailable days
            if day in [d.lower() for d in s.unavailable_days]:
                is_available = False
            
            # Check unavailable dates
            if date_str in s.unavailable_dates:
                is_available = False
            
            # Check weekly hours limit
            if s.weekly_hours >= s.max_hours_per_week:
                is_available = False
            
            # Check role compatibility
            if not (role in s.roles or "general" in s.roles):
                is_available = False
            
            if is_available:
                avail.append(s)
        
        # Sort by fairness (lower total hours first) and cost (lower hourly rate)
        avail.sort(key=lambda x:(x.weekly_hours, x.hourly_rate))
        return avail[:max(0, count)]

    def _new_shift_for_role(self, date: str, staff: StaffMember, role: str):
        # try role-specific template
        st, et = self.role_shift_templates.get(role, None) or \
                 self.shift_templates.get(staff.preferred_shifts[0], None) if staff.preferred_shifts else None
        if not st:
            st, et = ("09:00","17:00")
        return Shift(
            shift_id=f"opt_{date}{staff.staff_id}{role}_{datetime.now().strftime('%H%M%S%f')[:6]}",
            staff_id=staff.staff_id, date=date,
            start_time=st, end_time=et, role=role,
            is_owner_created=False, is_optimized=True
        )

    # --- Optimization
    def _apply_optimization(self, shifts: List[Shift], staff: List[StaffMember], preds: Dict[str, int], business_type: Optional[str]):
        shifts = list(shifts)
        changes = []
        group = self._group_by_date(shifts)

        # Reset weekly hours and recompute from current shifts
        for s in staff: s.weekly_hours = 0
        for sh in shifts:
            stf = next((x for x in staff if x.staff_id == sh.staff_id), None)
            if stf:
                stf.weekly_hours += self._hours(sh.start_time, sh.end_time)

        # For each date: enforce business-type role mix and predicted counts
        for d, req in preds.items():
            cur = group.get(d, [])
            # Count existing by role
            role_counts: Dict[str, int] = {}
            for sh in cur:
                role_counts[sh.role] = role_counts.get(sh.role, 0) + 1

            # Desired role mix for this date
            desired = self._role_mix(d, req, business_type, features={})

            # 1) Add missing roles up to desired counts
            for role, want in desired.items():
                have = role_counts.get(role, 0)
                need = want - have
                if need > 0:
                    for s in self._select_staff_for_role(d, staff, need, role):
                        sh = self._new_shift_for_role(d, s, role)
                        if self._hours(sh.start_time, sh.end_time) <= self.max_hours_per_day:
                            shifts.append(sh)
                            s.weekly_hours += self._hours(sh.start_time, sh.end_time)
                            changes.append({"type":"ADDED","date":d,
                                            "staff_id":s.staff_id,"staff_name":s.name,
                                            "shift_time":f"{sh.start_time}-{sh.end_time}",
                                            "role": role,
                                            "reason":f"Meet business-type role mix ({business_type or 'general'})"})
                # refresh group and role counts after additions
                group = self._group_by_date(shifts)
                role_counts = {}
                for sh in group.get(d, []):
                    role_counts[sh.role] = role_counts.get(sh.role, 0) + 1

            # 2) If total is still under predicted (due to rounding), fill with frontline roles
            cur_total = len(group.get(d, []))
            if cur_total < req:
                fill_roles = self._frontline_roles_for_bt(business_type)
                deficit = req - cur_total
                for role in fill_roles:
                    if deficit <= 0: break
                    add_now = min(deficit, 9999)
                    assigned = False
                    for s in self._select_staff_for_role(d, staff, add_now, role):
                        sh = self._new_shift_for_role(d, s, role)
                        if self._hours(sh.start_time, sh.end_time) <= self.max_hours_per_day:
                            shifts.append(sh)
                            s.weekly_hours += self._hours(sh.start_time, sh.end_time)
                            changes.append({"type":"ADDED","date":d,
                                            "staff_id":s.staff_id,"staff_name":s.name,
                                            "shift_time":f"{sh.start_time}-{sh.end_time}",
                                            "role": role,
                                            "reason":"Fill remaining predicted requirement"})
                            deficit -= 1
                            assigned = True
                    if assigned:
                        group = self._group_by_date(shifts)

            # 3) If overstaffed vs predicted, remove lowest-priority roles first (non-owner & higher cost)
            cur = group.get(d, [])
            total_after = len(cur)
            if total_after > req:
                excess = total_after - req
                removal_priority = self._removal_priority_for_bt(business_type)
                # score: (rolePriority, ownerPenalty, cost, hours) → higher score removed first
                def role_pri(role): 
                    return removal_priority.get(role, removal_priority.get("*", 50))
                scored: List[Tuple[Tuple[int,int,float,float], Shift]] = []
                for sh in cur:
                    owner_pen = 0 if not sh.is_owner_created else 100
                    cost = self._cost(sh, staff)
                    hrs = self._hours(sh.start_time, sh.end_time)
                    scored.append(((role_pri(sh.role), owner_pen, cost, hrs), sh))
                for _, sh in sorted(scored, key=lambda x: x[0], reverse=True)[:excess]:
                    shifts.remove(sh)
                    st = next((x for x in staff if x.staff_id == sh.staff_id), None)
                    if st: st.weekly_hours -= self._hours(sh.start_time, sh.end_time)
                    changes.append({"type":"REMOVED","date":d,
                                    "staff_id":sh.staff_id,
                                    "staff_name":st.name if st else "?",
                                    "shift_time":f"{sh.start_time}-{sh.end_time}",
                                    "role": sh.role,
                                    "reason":"Reduce overstaffing vs predicted"})
                group = self._group_by_date(shifts)

        return shifts, changes

    def _frontline_roles_for_bt(self, business_type: Optional[str]) -> List[str]:
        bt = (business_type or "general").lower()
        if bt.startswith("electronics"):
            return ["cashier","floor_exec","packer_fragile","qc","picker","delivery","general"]
        if bt in ("grocery","supermarket"):
            return ["cashier","floor_exec","picker","delivery","qc","general"]
        if bt in ("restaurant","cafe","qsr"):
            return ["floor_exec","cashier","delivery","general","qc"]
        if bt in ("pharmacy","chemists"):
            return ["cashier","picker","delivery","floor_exec","qc","general"]
        if bt in ("fashion","clothing","apparel"):
            return ["floor_exec","cashier","general","qc"]
        return ["cashier","floor_exec","general","picker","qc","delivery"]

    def _removal_priority_for_bt(self, business_type: Optional[str]) -> Dict[str, int]:
        """
        Lower number = more critical (keep), higher = easier to remove first.
        """
        bt = (business_type or "general").lower()
        if bt.startswith("electronics"):
            return {"cashier": 5, "floor_exec": 10, "packer_fragile": 5, "qc": 8, "picker": 12, "delivery": 15, "general": 20, "*": 50}
        if bt in ("grocery","supermarket"):
            return {"cashier": 5, "floor_exec": 8, "picker": 10, "delivery": 12, "qc": 15, "general": 20, "*": 50}
        if bt in ("restaurant","cafe","qsr"):
            return {"floor_exec": 5, "cashier": 8, "delivery": 10, "general": 12, "qc": 20, "*": 50}
        if bt in ("pharmacy","chemists"):
            return {"cashier": 5, "picker": 8, "delivery": 10, "floor_exec": 12, "qc": 15, "general": 20, "*": 50}
        if bt in ("fashion","clothing","apparel"):
            return {"floor_exec": 5, "cashier": 8, "general": 12, "qc": 20, "*": 50}
        return {"cashier": 5, "floor_exec": 8, "general": 12, "picker": 15, "qc": 18, "delivery": 20, "*": 50}

    def _apply_staff_unavailability(self, date, staff_id, shifts, staff, business_type):
        removed = [sh for sh in shifts if sh.date == date and sh.staff_id == staff_id]
        for sh in removed: shifts.remove(sh)
        changes = []
        # Try to replace like-for-like role first
        for sh in removed:
            role = sh.role
            candidates = self._select_staff_for_role(date, staff, 1, role)
            if candidates:
                s = candidates[0]
                new = self._new_shift_for_role(date, s, role)
                shifts.append(new)
                s.weekly_hours += self._hours(new.start_time, new.end_time)
                changes.append({
                    "type":"ADDED","date":date,
                    "staff_id":s.staff_id,"staff_name":s.name,
                    "shift_time":f"{new.start_time}-{new.end_time}",
                    "role": role,
                    "reason":"Replacement for unavailable staff (same role)"
                })
            else:
                # fallback any frontline
                for r in self._frontline_roles_for_bt(business_type):
                    alt = self._select_staff_for_role(date, staff, 1, r)
                    if alt:
                        s = alt[0]
                        new = self._new_shift_for_role(date, s, r)
                        shifts.append(new)
                        s.weekly_hours += self._hours(new.start_time, new.end_time)
                        changes.append({
                            "type":"ADDED","date":date,
                            "staff_id":s.staff_id,"staff_name":s.name,
                            "shift_time":f"{new.start_time}-{new.end_time}",
                            "role": r,
                            "reason":"Replacement for unavailable staff (closest role)"
                        })
                        break
        return shifts, changes

    # --- Output Builders
    def _flat(self, shifts, staff):
        out = []
        for sh in sorted(shifts, key=lambda x:(x.date, x.start_time, x.staff_id)):
            s = next((st for st in staff if st.staff_id == sh.staff_id), None)
            if not s: continue
            out.append({
                "shift_id": sh.shift_id, "date": sh.date,
                "start_time": sh.start_time, "end_time": sh.end_time,
                "role": sh.role, "is_owner_created": sh.is_owner_created,
                "is_optimized": sh.is_optimized,
                "staff_id": s.staff_id, "staff_name": s.name,
                "hourly_rate": s.hourly_rate,
                "hours": self._hours(sh.start_time, sh.end_time),
                "cost": self._cost(sh, staff)
            })
        return out

    def _calendar(self, shifts, staff, preds, business_type):
        if not preds and not shifts:
            return {"days":[]}
        dates = sorted(set(list(preds.keys()) + [s.date for s in shifts]))
        group = self._group_by_date(shifts)
        days = []
        for d in dates:
            dw = datetime.strptime(d, "%Y-%m-%d").strftime("%a")
            flat = [x for x in self._flat(group.get(d, []), staff)]
            pred = preds.get(d, 0)
            status = "ok"
            if pred and len(flat) < pred: status = "understaffed"
            elif pred and len(flat) > pred: status = "overstaffed"
            # role counts
            role_counts: Dict[str,int] = {}
            for f in flat:
                role_counts[f["role"]] = role_counts.get(f["role"],0)+1
            days.append({
                "date": d, "day_name": dw, "predicted_required": pred,
                "actual_count": len(flat), "status": status,
                "business_type": business_type,
                "totals": {
                    "shifts": len(flat),
                    "hours": round(sum(x["hours"] for x in flat), 2),
                    "cost": round(sum(x["cost"] for x in flat), 2)
                },
                "roles": role_counts,
                "shifts": flat
            })
        return {"start_date": dates[0], "end_date": dates[-1], "days": days}

    def _payroll(self, shifts, staff):
        pay = {}
        for sh in shifts:
            s = next((x for x in staff if x.staff_id == sh.staff_id), None)
            if s:
                pay.setdefault(s.name, 0)
                pay[s.name] += self._cost(sh, staff)
        return {k: round(v, 2) for k, v in pay.items()}

    def _summary(self, orig, opt, staff, preds):
        oc = sum(self._cost(s, staff) for s in orig)
        nc = sum(self._cost(s, staff) for s in opt)
        return {
            "total_shifts_before": len(orig),
            "total_shifts_after": len(opt),
            "shifts_change": len(opt) - len(orig),
            "total_cost_before": round(oc, 2),
            "total_cost_after": round(nc, 2),
            "cost_savings": round(oc - nc, 2),
            "days_optimized": len(preds),
            "predicted_staff_range": (
                f"{min(preds.values())}-{max(preds.values())}" if preds else "N/A")
        }

    def _build_output(self, staff, orig, opt, preds, changes, business_type):
        return {
            "calendar": self._calendar(opt, staff, preds, business_type),
            "flat_shifts": self._flat(opt, staff),
            "changes": changes,
            "predictions": preds,
            "summary": self._summary(orig, opt, staff, preds),
            "payroll": self._payroll(opt, staff),
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "total_staff": len(staff),
                "total_shifts": len(opt),
                "business_type": business_type or "general"
            }
        }

    # --- LLM-style post-processing (no external calls here)
    def _maybe_llm_post_process(self, result: Dict[str, Any], business_type: Optional[str]) -> Dict[str, Any]:
        """
        Placeholder to adjust final schedule via LLM. For now, we:
        - Check if any day is understaffed on frontline roles → suggest adding from float/general pool.
        - If overstaffed on low-priority roles → suggest trimming.
        Returns same JSON with llm_suggestions field.
        """
        if not USE_LLM_POST:
            result["llm_suggestions"] = self._heuristic_suggestions(result, business_type)
            return result

        # If you wire an actual LLM, pass result and business_type into llm_post_process
        # and replace the section below.
        # result = llm_post_process(result, business_type)
        return result

    def _heuristic_suggestions(self, result: Dict[str, Any], business_type: Optional[str]) -> List[str]:
        suggestions = []
        cal = result.get("calendar", {})
        days = cal.get("days", [])
        role_keep_pri = self._removal_priority_for_bt(business_type)
        frontline = self._frontline_roles_for_bt(business_type)

        for day in days:
            pred = day.get("predicted_required", 0)
            actual = day.get("actual_count", 0)
            roles = day.get("roles", {})
            date = day.get("date")
            if actual < pred:
                # find a frontline role with lowest presence
                deficit = pred - actual
                try_role = min(frontline, key=lambda r: roles.get(r, 0)) if frontline else "general"
                suggestions.append(
                    f"{date}: Understaffed by {deficit}. Prefer adding role '{try_role}' based on business '{business_type or 'general'}'."
                )
            elif actual > pred:
                # find removable role by priority
                removable = sorted(roles.items(), key=lambda kv: role_keep_pri.get(kv[0], 999), reverse=True)
                if removable:
                    r, c = removable[0]
                    suggestions.append(
                        f"{date}: Overstaffed by {actual - pred}. Consider trimming role '{r}' first."
                    )
        if not suggestions:
            suggestions.append("Schedule aligns with business-type role mix and predicted demand.")
        return suggestions

# ---------------------------------
# Flask Routes
# ---------------------------------
engine = ScheduleEngine()

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status":"ok","message":"Schedule optimizer is running"})

@app.route("/schedule", methods=["POST"])
def schedule():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"success":False,"error":"Invalid JSON body"}),400
        staff  = data.get("staff",[])
        sched  = data.get("schedule",[])
        feats  = data.get("feature_lookup",{})
        business_type = data.get("business_type")  # NEW
        if not staff:
            return jsonify({"success":False,"error":"staff is required"}),400
        result = engine.optimize(staff,sched,feats,business_type)
        return jsonify({"success":True,**result})
    except Exception as e:
        logger.exception("Error in /schedule")
        return jsonify({"success":False,"error":str(e)}),500

@app.route("/update", methods=["POST"])
def update():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"success":False,"error":"Invalid JSON body"}),400
        staff  = data.get("staff",[])
        sched  = data.get("schedule",[])
        feats  = data.get("feature_lookup",{})
        upd    = data.get("update",{})
        business_type = data.get("business_type")  # NEW
        if not staff or not upd:
            return jsonify({"success":False,"error":"staff and update are required"}),400
        result = engine.update_schedule(staff,sched,feats,upd,business_type)
        return jsonify({"success":True,**result})
    except Exception as e:
        logger.exception("Error in /update")
        return jsonify({"success":False,"error":str(e)}),500

def optimize_schedule_from_data(data: dict, business_id: str) -> dict:
    """Optimize schedule from extracted data with business type awareness"""
    try:
        # Parse staff data
        staff_members = []
        for staff_data in data.get('staff', []):
            staff_members.append(StaffMember(
                staff_id=staff_data.get('staff_id', ''),
                name=f"{staff_data.get('first_name', '')} {staff_data.get('last_name', '')}".strip(),
                hourly_rate=float(staff_data.get('hourly_rate', 0)),
                max_hours_per_week=int(staff_data.get('max_hours_per_week', 0)),
                preferred_shifts=staff_data.get('preferred_shifts', []),
                unavailable_days=staff_data.get('unavailable_days', []),
                roles=[staff_data.get('role', 'general')] if staff_data.get('role') else ['general']
            ))
        
        # Parse existing schedule
        existing_shifts = []
        for shift_data in data.get('schedule', []):
            existing_shifts.append(Shift(
                shift_id=shift_data.get('shift_id', ''),
                staff_id=shift_data.get('staff_id', ''),
                date=shift_data.get('date', ''),
                start_time=shift_data.get('start_time', ''),
                end_time=shift_data.get('end_time', ''),
                role=shift_data.get('role', ''),
                is_owner_created=shift_data.get('is_owner_created', True),
                is_optimized=shift_data.get('is_optimized', False)
            ))
        
        # Parse feature lookup
        feature_lookup = data.get('feature_lookup', {})
        
        # Get business type
        business_type = data.get('business_type', 'general')
        
        # Create schedule optimizer
        optimizer = ScheduleEngine()
        
        # Generate optimized schedule with business type awareness
        result = optimizer.optimize(
            staff_data=staff_members,
            schedule_data=existing_shifts,
            feature_lookup=feature_lookup,
            business_type=business_type
        )
        
        return {
            "success": True,
            "business_id": business_id,
            "business_type": business_type,
            "optimized_schedule": result.get('flat_shifts', []),
            "recommendations": result.get('recommendations', []),
            "summary": result.get('summary', {}),
            "calendar": result.get('calendar', []),
            "changes": result.get('changes', []),
            "predictions": result.get('predictions', []),
            "payroll": result.get('payroll', {}),
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "business_id": business_id
        }

def main():
    """Command line interface for schedule optimization"""
    import argparse
    import json
    
    parser = argparse.ArgumentParser(description='Optimize schedule with business type awareness')
    parser.add_argument('--input-file', required=True, help='JSON file with extracted data')
    parser.add_argument('--business-id', required=True, help='Business ID')
    parser.add_argument('--output-format', choices=['json', 'summary'], default='json', help='Output format')
    
    args = parser.parse_args()
    
    try:
        # Load input data
        with open(args.input_file, 'r') as f:
            data = json.load(f)
        
        # Optimize schedule
        result = optimize_schedule_from_data(data, args.business_id)
        
        if args.output_format == 'json':
            print(json.dumps(result, indent=2, default=str))
        else:
            print(f"Schedule optimization for business {args.business_id}")
            print(f"Business type: {result.get('business_type', 'general')}")
            print(f"Success: {result.get('success', False)}")
            if result.get('success'):
                print(f"Generated {len(result.get('optimized_schedule', []))} optimized shifts")
                print(f"Total cost: ${result.get('summary', {}).get('total_cost', 0):.2f}")
            else:
                print(f"Error: {result.get('error', 'Unknown error')}")
                
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "business_id": args.business_id
        }))

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] in ['--input-file', '--business-id', '--output-format']:
        # CLI mode
        main()
    else:
        # Flask server mode
        logger.info("🚀 Starting Smart AI Schedule Optimization Server (Business-aware)")
        app.run(host="0.0.0.0", port=5000, debug=True)