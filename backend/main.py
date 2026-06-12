import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import models
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Employee Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class EmployeeCreate(BaseModel):
    name: str
    email: str
    department: str

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None

class EmployeeStatusUpdate(BaseModel):
    status: str


class EmployeeOut(BaseModel):
    id:         int
    name:       str
    email:      str
    department: str
    status:     str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

VALID_TRANSITIONS = {
    "draft":     ["submitted"],
    "submitted": ["approved", "rejected"],
    "approved":  [],
    "rejected":  ["draft"],
}

@app.get("/employees", response_model=list[EmployeeOut])
def get_employees(db: Session = Depends(get_db)):
    return db.query(models.Employee).all()

@app.post("/employees", response_model=EmployeeOut, status_code=201)
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db)):
    emp = models.Employee(**payload.model_dump(), status="draft")
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp

@app.put("/employees/{emp_id}", response_model=EmployeeOut)
def update_employee(emp_id: int, payload: EmployeeUpdate, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if emp.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft records can be edited")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(emp, field, value)
    db.commit()
    db.refresh(emp)
    return emp

@app.patch("/employees/{emp_id}/status", response_model=EmployeeOut)
def update_status(emp_id: int, payload: EmployeeStatusUpdate, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    allowed = VALID_TRANSITIONS.get(emp.status, [])
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail=f"Cannot move from '{emp.status}' to '{payload.status}'. Allowed: {allowed}")
    emp.status = payload.status
    db.commit()
    db.refresh(emp)
    return emp

@app.delete("/employees/{emp_id}", status_code=204)
def delete_employee(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(emp)
    db.commit()