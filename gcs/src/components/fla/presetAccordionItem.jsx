import { Accordion, Button } from '@mantine/core'

export default function PresetAccordionItem({ category, selectPresetFunc }) {
  return (
    <Accordion.Item value={category.name}>
      <Accordion.Control>{category.name}</Accordion.Control>
      <Accordion.Panel>
        <div className='flex flex-col gap-2'>
          {category.filters.map((filter, idx) => {
            return (
              <Button key={idx} onClick={() => selectPresetFunc(filter)}>
                {filter.name}
              </Button>
            )
          })}
        </div>
      </Accordion.Panel>
    </Accordion.Item>
  )
}