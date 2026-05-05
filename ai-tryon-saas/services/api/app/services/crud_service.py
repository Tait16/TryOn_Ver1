import uuid
from typing import Any, Type

from sqlalchemy.orm import Session


def _apply_field_map(
    data: dict[str, Any],
    field_map: dict[str, str] | None = None,
) -> dict[str, Any]:
    if not field_map:
        return data

    mapped_data = {}

    for key, value in data.items():
        mapped_key = field_map.get(key, key)
        mapped_data[mapped_key] = value

    return mapped_data


def list_items(
    db: Session,
    model: Type,
    skip: int = 0,
    limit: int = 100,
):
    return db.query(model).offset(skip).limit(limit).all()


def get_item(
    db: Session,
    model: Type,
    item_id: uuid.UUID,
):
    return db.query(model).filter(model.id == item_id).first()


def create_item(
    db: Session,
    model: Type,
    data,
    field_map: dict[str, str] | None = None,
):
    obj_data = data.model_dump(exclude_unset=True)
    obj_data = _apply_field_map(obj_data, field_map)

    obj = model(**obj_data)

    db.add(obj)
    db.commit()
    db.refresh(obj)

    return obj


def update_item(
    db: Session,
    model: Type,
    item_id: uuid.UUID,
    data,
    field_map: dict[str, str] | None = None,
):
    obj = get_item(db, model, item_id)

    if not obj:
        return None

    update_data = data.model_dump(exclude_unset=True)
    update_data = _apply_field_map(update_data, field_map)

    for field, value in update_data.items():
        setattr(obj, field, value)

    db.commit()
    db.refresh(obj)

    return obj


def delete_item(
    db: Session,
    model: Type,
    item_id: uuid.UUID,
):
    obj = get_item(db, model, item_id)

    if not obj:
        return None

    db.delete(obj)
    db.commit()

    return obj