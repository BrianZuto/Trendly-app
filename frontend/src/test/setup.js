import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import client from '@core/api/client'
import { mockAdapter, reiniciarMock } from '@core/mocks/mockAdapter'

client.defaults.adapter = mockAdapter

beforeEach(() => {
    localStorage.clear()
    reiniciarMock()
})

afterEach(() => {
    cleanup()
})