import { beforeEach, describe, expect, it } from 'vitest'
import { useAnnotationStore, type TextAnnotation } from './annotationStore'

const createTextAnnotation = (text = ''): TextAnnotation => ({
  id: 'text-1',
  page: 1,
  type: 'text',
  color: '#000000',
  x: 10,
  y: 20,
  text
})

beforeEach(() => {
  useAnnotationStore.getState().clearAnnotations()
})

describe('annotation history', () => {
  it('undoes and redoes annotation creation', () => {
    const annotation = createTextAnnotation()
    useAnnotationStore.getState().addAnnotation(annotation)

    expect(useAnnotationStore.getState().annotations).toHaveLength(1)
    useAnnotationStore.getState().undo()
    expect(useAnnotationStore.getState().annotations).toEqual([])

    useAnnotationStore.getState().redo()
    expect(useAnnotationStore.getState().annotations).toEqual([annotation])
  })

  it('coalesces consecutive updates to the same annotation', () => {
    const annotation = createTextAnnotation()
    useAnnotationStore.getState().addAnnotation(annotation)
    useAnnotationStore.getState().updateAnnotation(annotation.id, { text: 'Hello' })
    useAnnotationStore.getState().updateAnnotation(annotation.id, { text: 'Hello world' })

    expect(useAnnotationStore.getState().history).toHaveLength(2)
    useAnnotationStore.getState().undo()
    expect((useAnnotationStore.getState().annotations[0] as TextAnnotation).text).toBe('')
    useAnnotationStore.getState().redo()
    expect((useAnnotationStore.getState().annotations[0] as TextAnnotation).text).toBe(
      'Hello world'
    )
  })

  it('clears redo history after a new edit', () => {
    const annotation = createTextAnnotation()
    useAnnotationStore.getState().addAnnotation(annotation)
    useAnnotationStore.getState().undo()
    expect(useAnnotationStore.getState().future).toHaveLength(1)

    useAnnotationStore.getState().addAnnotation({ ...annotation, id: 'text-2' })
    expect(useAnnotationStore.getState().future).toEqual([])
  })
})
