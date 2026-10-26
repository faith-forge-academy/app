import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Study from '../Study';
import rootReducer from '../../reducers';
import { setGlobalVerse } from '../../features/verseSlice';

class MockWorker {
  postMessage() {}
  terminate() {}
}

beforeAll(() => {
  window.Worker = MockWorker;
});

function renderStudy() {
  const store = configureStore({ reducer: rootReducer });
  return render(
    <Provider store={store}>
      <Study />
    </Provider>
  );
}

describe('Study', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows the saved verse and grades a typed recitation with a word diff', () => {
    window.localStorage.setItem('verse', JSON.stringify({
      id: 'John 3:16',
      content: 'For God so loved the world',
    }));

    renderStudy();

    expect(screen.getByText('For God so loved the world')).toBeInTheDocument();
    expect(screen.getAllByText('John 3:16').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('tab', { name: 'Test' }));
    fireEvent.change(screen.getByPlaceholderText(/type the scripture/i), {
      target: { value: 'For God loved the world' },
    });
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));

    expect(screen.getByText(/5\s*\/\s*6\s*words match/)).toBeInTheDocument();
    const missed = screen.getAllByText('so').find((el) => el.classList.contains('line-through'));
    expect(missed).toBeTruthy();
    const matched = screen.getAllByText('loved').find((el) => el.classList.contains('text-green-600'));
    expect(matched).toBeTruthy();
  });

  it('resets practice progress when a different verse is selected', () => {
    const store = configureStore({ reducer: rootReducer });
    const { rerender } = render(
      <Provider store={store}>
        <Study />
      </Provider>
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Practice' }));
    expect(screen.getByText(/0 \/ \d+ words/)).toBeInTheDocument();

    act(() => {
      store.dispatch(setGlobalVerse({ id: 'Psalm 23:1', content: 'The Lord is my shepherd' }));
    });
    rerender(
      <Provider store={store}>
        <Study />
      </Provider>
    );

    expect(screen.getAllByText('Psalm 23:1').length).toBeGreaterThan(0);
    expect(screen.getByText('0 / 5 words')).toBeInTheDocument();
  });
});
