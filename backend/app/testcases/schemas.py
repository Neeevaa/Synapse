from datetime import datetime
from uuid import UUID
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    TestCaseCategory,
    TestCaseStatus,
    TestCasePriority,
    TestCaseSource,
)


class TestCaseStepItem(BaseModel):
    step: int = Field(..., description="1-indexed step sequence number")
    action: str = Field(..., description="Action to perform in this test step")
    expected_result: str = Field(..., description="Expected outcome for this specific step")


class GeneratedTestCaseItem(BaseModel):
    title: str = Field(..., description="Descriptive title of the test case")
    description: str = Field(..., description="Summary of what is being validated")
    category: TestCaseCategory = Field(..., description="FUNCTIONAL, NEGATIVE, BOUNDARY, or ACCEPTANCE")
    priority: TestCasePriority = Field(default=TestCasePriority.MEDIUM, description="LOW, MEDIUM, HIGH, or URGENT")
    preconditions: Optional[str] = Field(None, description="System state, user permissions, or prerequisites")
    steps: List[TestCaseStepItem] = Field(default_factory=list, description="Ordered test execution steps")
    test_data: Optional[str] = Field(None, description="Input parameters, payloads, or mock data")
    expected_result: str = Field(..., description="Final overall expected result for the test scenario")


class TestCaseGenerationOutputSchema(BaseModel):
    test_cases: List[GeneratedTestCaseItem] = Field(
        ...,
        description="List of structured test cases covering functional, negative, boundary, and acceptance criteria",
    )


class TestCaseCreate(BaseModel):
    title: str
    description: str
    category: TestCaseCategory = TestCaseCategory.FUNCTIONAL
    priority: TestCasePriority = TestCasePriority.MEDIUM
    preconditions: Optional[str] = None
    test_steps: List[TestCaseStepItem] = Field(default_factory=list)
    expected_result: str
    test_data: Optional[str] = None


class TestCaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[TestCaseCategory] = None
    priority: Optional[TestCasePriority] = None
    preconditions: Optional[str] = None
    test_steps: Optional[List[TestCaseStepItem]] = None
    expected_result: Optional[str] = None
    test_data: Optional[str] = None


class TestCaseResponse(BaseModel):
    id: UUID
    company_id: UUID
    project_id: UUID
    requirement_id: UUID
    title: str
    description: str
    category: TestCaseCategory
    priority: TestCasePriority
    status: TestCaseStatus
    source: TestCaseSource
    preconditions: Optional[str] = None
    test_steps: List[Any] = Field(default_factory=list)
    expected_result: str
    test_data: Optional[str] = None
    generation_metadata: Optional[dict] = None
    created_by: UUID
    creator_name: Optional[str] = None
    approved_by: Optional[UUID] = None
    approver_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TestCaseListResponse(BaseModel):
    items: List[TestCaseResponse]
    total: int
    counts_by_status: dict[str, int]
    counts_by_category: dict[str, int]
