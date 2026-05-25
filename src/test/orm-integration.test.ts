import { describe, it, expect } from 'vitest';
import { SQLAlchemyProvider } from '../features/orm-integration/sqlalchemy-provider';
import { DjangoProvider } from '../features/orm-integration/django-provider';

describe('SQLAlchemyProvider', () => {
  const provider = new SQLAlchemyProvider();

  it('should parse a basic SQLAlchemy model', () => {
    const content = `
from sqlalchemy import Column, Integer, String
from database import Base

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String(100))
    email = Column(String(255), nullable=False)
`;
    const schemas = provider.parseModel('/models.py', content);
    expect(schemas).toHaveLength(1);
    expect(schemas[0].tableName).toBe('users');
    expect(schemas[0].className).toBe('User');
    expect(schemas[0].columns).toHaveLength(3);
    expect(schemas[0].columns[0]).toEqual({ name: 'id', type: 'number', nullable: true, primaryKey: true });
    expect(schemas[0].columns[2].nullable).toBe(false);
  });

  it('should detect relationships', () => {
    const content = `
class Post(Base):
    __tablename__ = 'posts'
    id = Column(Integer, primary_key=True)
    author_id = Column(Integer, ForeignKey('users.id'))
    comments = relationship("Comment")
`;
    const schemas = provider.parseModel('/models.py', content);
    expect(schemas[0].relations).toHaveLength(2);
    expect(schemas[0].relations[0].name).toBe('comments');
    expect(schemas[0].relations[1].type).toBe('foreign-key');
  });

  it('should infer tablename from class name when __tablename__ missing', () => {
    const content = `
class UserProfile(Base):
    id = Column(Integer, primary_key=True)
`;
    const schemas = provider.parseModel('/models.py', content);
    expect(schemas[0].tableName).toBe('user_profiles');
  });
});

describe('DjangoProvider', () => {
  const provider = new DjangoProvider();

  it('should parse a basic Django model', () => {
    const content = `
from django.db import models

class Article(models.Model):
    title = models.CharField(max_length=200)
    body = models.TextField()
    views = models.IntegerField()
    published = models.BooleanField(default=False)
`;
    const schemas = provider.parseModel('/models.py', content);
    expect(schemas).toHaveLength(1);
    expect(schemas[0].className).toBe('Article');
    expect(schemas[0].columns).toHaveLength(4);
    expect(schemas[0].columns[0].type).toBe('string');
    expect(schemas[0].columns[2].type).toBe('number');
    expect(schemas[0].columns[3].type).toBe('boolean');
  });

  it('should detect ForeignKey and ManyToMany relations', () => {
    const content = `
class Comment(models.Model):
    article = models.ForeignKey('Article', on_delete=models.CASCADE)
    tags = models.ManyToManyField('Tag')
    text = models.TextField()
`;
    const schemas = provider.parseModel('/models.py', content);
    expect(schemas[0].relations).toHaveLength(2);
    expect(schemas[0].relations[0].type).toBe('foreign-key');
    expect(schemas[0].relations[1].type).toBe('many-to-many');
    expect(schemas[0].columns).toHaveLength(1); // text only, FK excluded
  });
});
